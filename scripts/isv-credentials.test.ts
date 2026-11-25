import {strict as assert} from 'node:assert';
import {randomBytes} from 'node:crypto';
import {sealCredential,openCredential} from '../lib/messaging/isv/credentials';
const key=randomBytes(32),ctx={owner:'synthetic-A',accountSid:'AC'+'1'.repeat(32)},ring=new Map([['test-v1',key]]);
const a=sealCredential('synthetic-token-only',ctx,'test-v1',key),b=sealCredential('synthetic-token-only',ctx,'test-v1',key);
assert.notEqual(a.ciphertext,b.ciphertext);assert.equal(openCredential(a,ctx,ring),'synthetic-token-only');
assert.throws(()=>openCredential(a,{...ctx,owner:'synthetic-B'},ring));assert.throws(()=>openCredential(a,{...ctx,accountSid:'AC'+'2'.repeat(32)},ring));assert.throws(()=>openCredential(a,ctx,new Map()));assert.throws(()=>openCredential({...a,tag:Buffer.alloc(16).toString('base64')},ctx,ring));assert.equal(JSON.stringify(a).includes('synthetic-token-only'),false);
console.log('PASS: authenticated encryption, random nonce, workspace/account binding, missing keys and tamper rejection. Synthetic keys only.');
