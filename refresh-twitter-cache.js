#!/usr/bin/env node

/**
 * Script para forçar atualização do cache do Twitter
 * Pode ser executado manualmente ou via cron job
 * 
 * Uso:
 *   node refresh-twitter-cache.js
 * 
 * Cron (atualizar a cada 30 minutos):
 *   */30 * * * * cd /path/to/project && node refresh-twitter-cache.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configurações
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_REFRESH_TOKEN; // Token de admin para autenticação

async function refreshCache(type) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/twitter/${type}?force=true`;
        
        console.log(`🔄 Atualizando cache de ${type}...`);
        console.log(`   URL: ${url}`);

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const client = url.startsWith('https') ? https : require('http');

        const req = client.request(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (result.success) {
                        console.log(`✅ ${type}: ${result.tweets?.length || 0} items atualizados`);
                        console.log(`   Username: @${result.username}`);
                        console.log(`   Cached: ${result.cached ? 'Sim' : 'Não (API chamada)'}`);
                        resolve(result);
                    } else {
                        console.error(`❌ ${type}: ${result.error || 'Erro desconhecido'}`);
                        reject(new Error(result.error));
                    }
                } catch (error) {
                    console.error(`❌ ${type}: Erro ao parsear resposta`, error);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ ${type}: Erro na requisição`, error);
            reject(error);
        });

        req.end();
    });
}

async function main() {
    console.log('🚀 Iniciando atualização do cache do Twitter...');
    console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
    console.log('');

    if (!ADMIN_TOKEN) {
        console.error('❌ ADMIN_REFRESH_TOKEN não configurado!');
        console.log('');
        console.log('Configure a variável de ambiente ADMIN_REFRESH_TOKEN com um token de admin válido.');
        console.log('Você pode obter este token fazendo login como admin e copiando o token do localStorage.');
        process.exit(1);
    }

    const startTime = Date.now();

    try {
        // Atualizar fotos
        await refreshCache('fotos');
        console.log('');

        // Esperar 2 segundos para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Atualizar vídeos
        await refreshCache('videos');
        console.log('');

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Atualização concluída em ${duration}s`);
        console.log('');

        // Salvar log
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, 'twitter-cache-refresh.log');
        const logEntry = `[${new Date().toISOString()}] Cache atualizado com sucesso (${duration}s)\n`;
        fs.appendFileSync(logFile, logEntry);

    } catch (error) {
        console.error('❌ Erro durante atualização:', error.message);
        
        // Salvar erro no log
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, 'twitter-cache-refresh.log');
        const logEntry = `[${new Date().toISOString()}] ERRO: ${error.message}\n`;
        fs.appendFileSync(logFile, logEntry);

        process.exit(1);
    }
}

// Executar
main();
