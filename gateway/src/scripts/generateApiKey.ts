import crypto from 'crypto'; 
import { redis } from '../redisClient';
import { hashApiKey } from '../auth';

async function main() {
    const rawKey = crypto.randomBytes(32).toString('hex'); 
    await redis.set(`apikey:${hashApiKey(rawKey)}`, '1');

    console.log('New API key generated - copy it now, it will not be shown again:');
    console.log(rawKey); 
    
    await redis.quit();
}

main(); 