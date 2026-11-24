const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
    const defaultEnv = [
        'PORT=3000',
        'NODE_ENV=production',
        'DATABASE_URL="file:./dev.db"',
        'JWT_SECRET=roombeat_prod_jwt_secret_render_2026',
        'JWT_EXPIRES_IN=7d',
        'UPLOAD_DIR=./uploads',
        'MAX_FILE_SIZE=52428800',
        'CORS_ORIGIN=*'
    ].join('\n') + '\n';
    fs.writeFileSync(envPath, defaultEnv, 'utf8');
    console.log('[ensure-env] Generated default .env file with SQLite DATABASE_URL');
}

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('[ensure-env] Created uploads directory');
}
