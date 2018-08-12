/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './levelDBData';
const db = level(chainDB, { valueEncoding: 'json' });

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(callback=()=>{}){
    this.blockCount = 0;
    this.getLevelDBCount().then((c)=>{
      console.log('Current total block count: ', c);
      if(c == 0){
        this.addBlock(new Block("First block in the chain - Genesis block"));
      }
      else{
        this.blockCount = c;
        callback(this);
      }
    });
  }

  // Get block count in levelDB
  getLevelDBCount()
  {
    return new Promise(resolve => {
      let c = 0;
      db.createKeyStream().on('data', () => {c++;})
                          .on('error', err => {console.log('getLevelDBCount method error: ', err)})
                          .on('end', () => {resolve(c)});
    })
  }

  // Add new block
  addBlock(newBlock){
    return new Promise(resolve => {
      this.getLevelDBCount().then((c)=>{
        newBlock.height = c;
        newBlock.time = new Date().getTime().toString().slice(0,-3);
        if(c>0){
          db.get(c-1).then((previousBlock)=>{
            newBlock.previousBlockHash = previousBlock.hash;
            newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
            db.put(c, newBlock).then(()=>{
              this.blockCount++;
              console.log('Added block height: ', newBlock.height);
              this.validateBlock(newBlock.height);
              this.validateChain();
              resolve(newBlock);
            });
          });
        }else{
          newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
          db.put(c, newBlock).then(()=>{
            this.blockCount++;
            console.log('Added block height: ', newBlock.height);
            this.validateBlock(newBlock.height);
            this.validateChain();
            resolve(newBlock);
          });
        }
      });
    });


    // Block height
    newBlock.height = this.chain.length;
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if(this.chain.length>0){
      newBlock.previousBlockHash = this.chain[this.chain.length-1].hash;
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
    this.chain.push(newBlock);
    
    //Adding block object to levelDB
    console.log(this.getBlockHeight());
    addLevelDBData(this.getBlockHeight(), newBlock);
  }

  // Get block height
    getBlockHeight(){
      return this.blockCount-1;
    }

    // get block
    getBlock(blockHeight){
      // return object as a single string
      return db.get(blockHeight);
    }

    // validate block
    validateBlock(blockHeight){
      
      return new Promise(resolve=>{
        db.get(blockHeight).then((currentBlock)=>{
          // get block object
          let block = currentBlock;
           // get block hash
          let blockHash = block.hash;
          // remove block hash to test block integrity
          block.hash = '';
          // generate block hash
          let validBlockHash = SHA256(JSON.stringify(block)).toString();
          // Compare
          if (blockHash===validBlockHash) {
              console.log('Block #'+blockHeight+' valid.');
              resolve(true);
            } else {
              console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
              resolve(false);
            }
        });
      });
    }

   // Validate blockchain
    validateChain(){
      let errorLog = [];
      let previousHash = '';
      db.createValueStream().on('data', data => {
        let block = data;
        this.validateBlock(block.height).then((result)=>{
          if(result){
            if(block.height>0){
              if(previousHash != block.previousBlockHash){
                errorLog.push(block.height);
              }
            }
          }else{errorLog.push(block.height);}
        });
        previousHash = block.hash;
      }).on('end', ()=>{
        if (errorLog.length>0) {
          console.log('Block errors = ' + errorLog.length);
          console.log('Blocks: '+errorLog);
        } else {
          console.log('No errors detected');
        }
      }).on('error', err => {
        console.log('validateChain method error: ', err);
      });
    }
}


//Test blockchain 
console.log("Testing blockchain save in levelDB");

let blockchain = new Blockchain((blockchain)=>{
  console.log('Adding block height: ',blockchain.blockCount);
  if (blockchain.blockCount>=1){
    blockchain.addBlock(new Block("new test block"));
  }
});

