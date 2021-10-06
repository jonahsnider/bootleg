const base = require('@jonahsnider/xo-config');

const config = {...base};

config.rules['unicorn/prefer-module'] = 'off';
config.rules['unicorn/prefer-node-protocol'] = 'off';

module.exports = config;
