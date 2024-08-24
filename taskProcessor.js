const logger = require('./config/logger');

async function task(user_id) {
    const logMessage = `${user_id}-task completed at-${Date.now()}`;
    console.log(logMessage);
    logger.info(logMessage); 
}

module.exports = async (job) => {
    const { user_id } = job.data;
    await task(user_id); 
};
