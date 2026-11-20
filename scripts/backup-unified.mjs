import {createUnifiedBackups} from '../online/dokploy/unified-backup.mjs';
await createUnifiedBackups().run();
console.log('Birleşik yedek doğrulandı ve kaydedildi.');
