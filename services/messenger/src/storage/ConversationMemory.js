class ConversationMemory{
constructor(s){this.storage=s;}
async getHistory(u,ch){try{const c=await this.storage.getConversation(u,ch);return JSON.parse(c.messages||'[]');}catch(e){return [];}}
async addMessage(u,ch,r,c){try{const conv=await this.storage.getConversation(u,ch);const m=JSON.parse(conv.messages||'[]');m.push({role:r,content:c,timestamp:new Date().toISOString()});await this.storage.updateConversation(conv.id,m.slice(-10));}catch(e){}}
}
module.exports={ConversationMemory};
