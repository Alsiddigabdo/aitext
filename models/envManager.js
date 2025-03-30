const fs = require('fs').promises;
const path = require('path');

const envFilePath = path.resolve(__dirname, '../.env');

class EnvManager {
    static async readEnvFile() {
        try {
            const envContent = await fs.readFile(envFilePath, 'utf8');
            const envLines = envContent.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
            const envObject = {};
            envLines.forEach(line => {
                const [key, value] = line.split('=');
                envObject[key.trim()] = value.trim();
            });
            return envObject;
        } catch (error) {
            throw new Error(`فشل قراءة ملف .env: ${error.message}`);
        }
    }

    static async updateApiKey(newApiKey) {
        try {
            const envObject = await this.readEnvFile();
            envObject['API_KEY'] = newApiKey;
            const updatedEnvContent = Object.entries(envObject)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
            await fs.writeFile(envFilePath, updatedEnvContent, 'utf8');
            return true;
        } catch (error) {
            throw new Error(`فشل تحديث مفتاح API_KEY: ${error.message}`);
        }
    }
}

module.exports = EnvManager;