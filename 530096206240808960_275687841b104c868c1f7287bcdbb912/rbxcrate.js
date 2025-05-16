const axios = require('axios');
const config = require('./config.json');

class RBXCrate {
    constructor() {
        this.apiKey = config.rbxcrate.api_key;
        this.baseURL = config.rbxcrate.base_url;
    }

    async createOrder(userId, robuxAmount) {
        try {
            const response = await axios.post(`${this.baseURL}/orders`, {
                user_id: userId,
                amount: robuxAmount,
                product: 'robux'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Erro RBXCrate:', error.response?.data || error.message);
            throw error;
        }
    }

    async checkOrder(orderId) {
        try {
            const response = await axios.get(`${this.baseURL}/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Erro RBXCrate:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new RBXCrate();