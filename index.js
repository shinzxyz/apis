(async () => {
    const express = require('express');
    const fs = require('fs');
    const path = require('path');
    const set = require('./settings');
    const chalk = require('chalk');
    
    const app = express();
    const PORT = process.env.PORT || 3355;
    
    // API Key Configuration
    const API_KEY = 'yoedzx';
    const API_KEY_RESET_MONTH = 1; // Reset on 1st of each month
    const API_KEY_GRACE_PERIOD = 2; // 2-day grace period
    const API_LIMIT = 80000;
    const API_RATE_LIMIT = 5; // 5 requests/second
    const API_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
    
    const logger = {
        info: (message) => console.log(chalk.dim.blue('•') + chalk.dim(' info  - ') + message),
        ready: (message) => console.log(chalk.dim.green('•') + chalk.dim(' ready - ') + message),
        warn: (message) => console.log(chalk.dim.yellow('•') + chalk.dim(' warn  - ') + message),
        error: (message) => console.log(chalk.dim.red('•') + chalk.dim(' error - ') + message),
        event: (message) => console.log(chalk.dim.cyan('•') + chalk.dim(' event - ') + message)
    };
    
    // API Usage Tracking
    const apiUsage = new Map();
    const rateLimit = new Map();
    
    app.set('trust proxy', true);
    app.set('json spaces', 2);
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    logger.info('Starting server initialization...');

    // =============================================
    // STATIC FILE SERVING CONFIGURATION
    // =============================================
    app.use(express.static(path.join(__dirname))); // Serve root files
    app.use('/docs', express.static(path.join(__dirname, 'docs'))); // Serve docs files
    app.use('/image', express.static(path.join(__dirname, 'docs', 'image'))); // Serve images from docs

    // =============================================
    // API KEY VALIDATION MIDDLEWARE
    // =============================================
    function validateApiKey(req, res, next) {
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();
        
        const apiKey = req.query.apikey || req.body.apikey;

        if (!apiKey) {
            return res.status(401).json({
                status: false,
                message: 'API key is required.'
            });
        }

        if (apiKey !== API_KEY) {
            return res.status(403).json({
                status: false,
                message: 'Invalid API key'
            });
        }

        if (currentDay <= API_KEY_GRACE_PERIOD && currentDay >= API_KEY_RESET_MONTH) {
            return res.status(403).json({
                status: false,
                message: 'API key is being reset. Please try again after the grace period.'
            });
        }

        const ip = req.ip;
        const currentWindow = Math.floor(now.getTime() / API_RATE_LIMIT_WINDOW);
        const rateKey = `${ip}:${currentWindow}`;

        if (!rateLimit.has(rateKey)) {
            rateLimit.set(rateKey, {
                count: 0,
                lastReset: now.getTime()
            });
        }

        const rateData = rateLimit.get(rateKey);
        rateData.count++;

        if (rateData.count > API_RATE_LIMIT) {
            const timeLeft = API_RATE_LIMIT_WINDOW - (now.getTime() - rateData.lastReset);
            return res.status(429).json({
                status: false,
                message: `Too many requests. Please wait ${Math.ceil(timeLeft/1000)} seconds before trying again.`
            });
        }

        const usageKey = `${currentMonth}:${apiKey}`;
        if (!apiUsage.has(usageKey)) {
            apiUsage.set(usageKey, {
                count: 0,
                resetMonth: currentMonth
            });
        }

        const usageData = apiUsage.get(usageKey);
        usageData.count++;

        if (usageData.count > API_LIMIT) {
            return res.status(429).json({
                status: false,
                message: 'Monthly API limit exceeded. The key will reset at the beginning of next month.'
            });
        }

        next();
    }
    
    // =============================================
    // RESPONSE FORMATTING MIDDLEWARE
    // =============================================
    app.use((req, res, next) => {
        const originalJson = res.json;
        res.json = function (data) {
            if (data && typeof data === 'object') {
                const statusCode = res.statusCode || 200;
                
                const responseData = {
                    status: data.status,
                    statusCode: statusCode,
                    creator: set.author.toLowerCase(),
                    ...data
                };
                
                return originalJson.call(this, responseData);
            }
            return originalJson.call(this, data);
        };
        next();
    });
    
    // =============================================
    // STRING PROTOTYPE EXTENSION
    // =============================================
    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
    
    // =============================================
    // SCRAPER INITIALIZATION
    // =============================================
    logger.info('Loading scraper module...');
    global.scraper = new(await require('./lib/scrape.js'))('./lib/scrape_file');
    global.scrape = await scraper.list();
    
    setInterval(async () => {
        try {
            await scraper.load();
        } catch (error) {
            logger.error(`Failed to reload scraper: ${error.message}`);
        }
    }, 2000);
    
    // =============================================
    // ENDPOINT LOADING
    // =============================================
    function loadEndpointsFromDirectory(directory, baseRoute = '') {
        let endpoints = [];
        const fullPath = path.join(__dirname, directory);
        
        if (!fs.existsSync(fullPath)) {
            logger.warn(`Directory not found: ${fullPath}`);
            return endpoints;
        }
        
        logger.info(`Scanning directory: ${directory}...`);
        const items = fs.readdirSync(fullPath);
        
        items.forEach(item => {
            const itemPath = path.join(fullPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                console.log('');
                logger.info(`Found subdirectory: ${item}`);
                const nestedEndpoints = loadEndpointsFromDirectory(
                    path.join(directory, item), 
                    `${baseRoute}/${item}`
                );
                endpoints = [...endpoints, ...nestedEndpoints];
            } else if (stats.isFile() && item.endsWith('.js')) {
                try {
                    const module = require(itemPath);
                    
                    if (module && module.run && typeof module.run === 'function') {
                        const endpointName = item.replace('.js', '');
                        const endpointPath = `${baseRoute}/${endpointName}`;
                        
                        app.all(endpointPath, validateApiKey, module.run);
                        
                        let fullPathWithParams = endpointPath;
                        if (module.params && module.params.length > 0) {
                            fullPathWithParams += '?' + module.params.map(param => `${param}=`).join('&');
                        }
                        fullPathWithParams += `${module.params?.length ? '&' : '?'}apikey=`;
                        
                        const category = module.category || 'Other';
                        const categoryIndex = endpoints.findIndex(endpoint => endpoint.name === category);
                        
                        if (categoryIndex === -1) {
                            endpoints.push({
                                name: category,
                                items: []
                            });
                        }
                        
                        const categoryObj = endpoints.find(endpoint => endpoint.name === category);
                        
                        const endpointObj = {};
                        endpointObj[module.name || endpointName] = {
                            desc: module.desc || 'No description provided',
                            path: fullPathWithParams,
                            method: module.method || 'GET',
                            requiresApiKey: true
                        };
                        
                        categoryObj.items.push(endpointObj);
                        
                        logger.ready(`${chalk.green(endpointPath)} ${chalk.dim('(')}${chalk.cyan(category)}${chalk.dim(')')}`);
                    }
                } catch (error) {
                    logger.error(`Failed to load module ${itemPath}: ${error.message}`);
                }
            }
        });
        
        return endpoints;
    }
    
    // =============================================
    // ROUTE HANDLERS
    // =============================================
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Handle /docs without redirect
    app.get('/docs', (req, res) => {
        res.sendFile(path.join(__dirname, 'docs', 'index.html'));
    });

    // Special file handlers
    app.get('/script.js', (req, res) => {
        const docsPath = path.join(__dirname, 'docs', 'script.js');
        if (fs.existsSync(docsPath)) {
            res.sendFile(docsPath);
        } else {
            res.status(404).send('Not found');
        }
    });

    app.get('/style.css', (req, res) => {
        const docsPath = path.join(__dirname, 'docs', 'styles.css');
        if (fs.existsSync(docsPath)) {
            res.sendFile(docsPath);
        } else {
            res.sendFile(path.join(__dirname, 'styles.css'));
        }
    });

    app.get('/image/icon.png', (req, res) => {
        const iconPath = path.join(__dirname, 'docs', 'image', 'icon.png');
        if (fs.existsSync(iconPath)) {
            res.sendFile(iconPath);
        } else {
            res.status(404).send('Favicon not found');
        }
    });

    // =============================================
    // API ENDPOINTS
    // =============================================
    logger.info('Loading API endpoints...');
    const allEndpoints = loadEndpointsFromDirectory('api');
    console.log('');
    logger.ready(`Loaded ${allEndpoints.reduce((total, category) => total + category.items.length, 0)} endpoints`);
    
    app.get('/endpoints', (req, res) => {
        const totalEndpoints = allEndpoints.reduce((total, category) => {
            return total + category.items.length;
        }, 0);
        res.json({
            status: true,
            count: totalEndpoints,
            endpoints: allEndpoints
        });
    });
    
    app.get('/set', (req, res) => {
        res.json({
            status: true,
            ...set
        });
    });
    
    app.get('/apikey/status', (req, res) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const usageKey = `${currentMonth}:${API_KEY}`;
        const usage = apiUsage.get(usageKey) || { count: 0 };
        
        res.json({
            status: true,
            key: API_KEY,
            monthlyUsage: usage.count,
            monthlyLimit: API_LIMIT,
            remaining: API_LIMIT - usage.count,
            resetDate: new Date(now.getFullYear(), now.getMonth() + 1, API_KEY_RESET_MONTH).toISOString(),
            rateLimit: `${API_RATE_LIMIT} requests/second`
        });
    });
    
    // =============================================
    // MONTHLY RESET CHECK
    // =============================================
    function checkForMonthlyReset() {
        const now = new Date();
        if (now.getDate() === API_KEY_RESET_MONTH && now.getHours() === 0 && now.getMinutes() < 1) {
            logger.event('Resetting monthly API usage counters');
            apiUsage.clear();
        }
    }
    
    setInterval(checkForMonthlyReset, 60 * 60 * 1000);
    
    // =============================================
    // ERROR HANDLING
    // =============================================
    app.use((req, res, next) => {
        logger.info(`404: ${req.method} ${req.path}`);
        res.status(404).sendFile(path.join(__dirname, 'docs', 'err', '404.html'));
    });
    
    app.use((err, req, res, next) => {
        logger.error(`500: ${err.message}`);
        res.status(500).sendFile(path.join(__dirname, 'docs', 'err', '500.html'));
    });
    
    // =============================================
    // SERVER STARTUP
    // =============================================
    app.listen(PORT, () => {
        console.log('');
        logger.ready(`Server started successfully`);
        logger.info(`Local:   ${chalk.cyan(`http://localhost:${PORT}`)}`);
        
        try {
            const { networkInterfaces } = require('os');
            const nets = networkInterfaces();
            const results = {};
            
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        if (!results[name]) {
                            results[name] = [];
                        }
                        results[name].push(net.address);
                    }
                }
            }
            
            for (const [, addresses] of Object.entries(results)) {
                for (const addr of addresses) {
                    logger.info(`Network: ${chalk.cyan(`http://${addr}:${PORT}`)}`);
                }
            }
        } catch (error) {
            logger.warn(`Cannot detect network interfaces: ${error.message}`);
        }
        
        logger.info(`${chalk.dim('Ready for connections')}`);
    });
    
    module.exports = app;
})();