var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var _ = require('busyman');
var utils = require('./helpers/utils');

// Machine Server
// [TODO]
var cserver = require('coap-shepherd');

// RPC Server 啟動函式
// [TODO]
var startHttpServer = require('./httpServer');

// HTTP Server 啟動函式
// [TODO]
var startRpcServer = require('./rpcServer');

// 溫控系統的應用程式
// [TODO]
var lightCtrlApp = require('./lightCtrlApp');

var rpcServer,
    httpServer;

function start () {
    var dbPath = path.resolve(__dirname, '../node_modules/ble-shepherd/lib/database/ble.db');
    fs.exists(dbPath, function (isThere) {
        if (isThere) { fs.unlink(dbPath); }
    });

    // show Welcome Msg       
    showWelcomeMsg();

    // set Leave Msg
    setLeaveMsg();

    // 依序啟動 Machine Server, RPC Server 和 HTTP Server
    // [TODO] 
    cserver.start(function (err) {
        if (err)
            throw err;

        // 啟動 RPC Server
        rpcServer = startRpcServer();

        // 啟動 HTTP Server
        httpServer = startHttpServer();

        // Web Server 啟動之後，開始會有 socket 連入，監聽 'connection' 事件  
        rpcServer.on('connection', function (socket) {
            socket.on('req', clientReqHdlr);
        });
    });

    // 需要轉接 Machine Server 的事件至 Web Client 端
    // [TODO]
    cserver.on('error', errorEvtHdlr);
    cserver.on('permitJoining', permitJoiningEvtHdlr);
    cserver.on('ind', indEvtHdlr);
}

/**********************************************/
/* RPC Client Request Handler                 */
/**********************************************/
// 實作 Web Client 請求事件的處理函式 
// [TODO] 
function clientReqHdlr (msg) {
    var args = msg.args;

    if (msg.reqType === 'permitJoin') {
        cserver.permitJoin(args.time);
    } else if (msg.reqType === 'write') {
        cserver.find(args.permAddr).writeReq(args.auxId, args.value);
    }
}

    // ioServer.regReqHdlr('getDevs', function (args, cb) { 
    //     // [TODO]
    //     var devs = [];

    //     _.forEach(cserver.list(), function (dev) {
    //         devs.push(cserver.find(dev.clientName));
    //     });

    //     cb(null, utils.getDevsInfo(devs));
    // });

/**********************************************/
/* Machine Server Event Handler               */
/**********************************************/
function errorEvtHdlr (err) {
    console.log(chalk.red('[         error ] ') + err.message);
    rpcServer.emit('error', { msg: err.message });
}

function permitJoiningEvtHdlr (timeLeft) {
    console.log(chalk.green('[ permitJoining ] ') + timeLeft + ' sec');

    rpcServer.emit('ind', { 
        indType: 'permitJoining', 
        data: {
            timeLeft: timeLeft
        }
    });
}

function indEvtHdlr (msg) {
    var cnode = msg.cnode;

    switch (msg.type) {
        case 'devIncoming':
            devIncomingHdlr(cnode);
            break;

        case 'devStatus':
            devStatusHdlr(cnode, msg.data);
            break;

        case 'devNotify':
            devNotifyHdlr(cnode, msg.data);
            break;
    }
}

/**********************************************/
/* Peripheral Event Handler               */
/**********************************************/
function devIncomingHdlr (cnode) {
    console.log(chalk.yellow('[   devIncoming ] ') + '@' + devInfo.addr);

    rpcServer.emit('ind', {
        indType: 'devIncoming',
        data: {
            permAddr: permAddr
        }
    });
}

function devStatusHdlr (cnode, status) {
    if (status === 'online')
        status = chalk.green(status);
    else 
        status = chalk.red(status);

    console.log(chalk.magenta('[     devStatus ] ') + '@' + cnode.clientName + ', ' + status);

    rpcServer.emit('ind', {
        indType: 'devStatus',
        data: {
            devInfo: cnode.clientName,
            status: status
        }
    });
} 

function devNotifyHdlr (cnode, gadInfo) {
    var pathArray = utils.pathSlashParser(gadInfo.path),
        gad = utils.getGadInfo(pathArray[0], pathArray[1], pathArray[2], gadInfo.value);

    console.log(chalk.blue('[   attrsChange ] ') + '@' + cnode.clientName + ', auxId: ' + gad.auxId + ', value: ' + gad.value);
      
    rpcServer.emit('ind', {
        indType: 'attChange',
        data: {
            permAddr: cnode.clientName,
            gad: gad
        }
    });
}

/**********************************/
/* welcome function               */
/**********************************/
function showWelcomeMsg() {
    var coapPart1 = chalk.blue('   _____ ____   ___    ___          ____ __ __ ____ ___   __ __ ____ ___   ___ '),
        coapPart2 = chalk.blue('  / ___// __ \\ / _ |  / _ \\  ____  / __// // // __// _ \\ / // // __// _ \\ / _ \\'),
        coapPart3 = chalk.blue(' / /__ / /_/ // __ | / ___/ /___/ _\\ \\ / _  // _/ / ___// _  // _/ / , _// // /'),
        coapPart4 = chalk.blue(' \\___/ \\____//_/ |_|/_/          /___//_//_//___//_/   /_//_//___//_/|_|/____/ ');

    console.log('');
    console.log('');
    console.log('Welcome to coap-shepherd webapp... ');
    console.log('');
    console.log(coapPart1);
    console.log(coapPart2);
    console.log(coapPart3);
    console.log(coapPart4);
    console.log(chalk.gray('            An implementation of CoAP device management Server.'));
    console.log('');
    console.log('   >>> Author:     Peter Yi (peter.eb9@gmail.com)');
    console.log('   >>> Version:    coap-shepherd v1.0.0');
    console.log('   >>> Document:   https://github.com/PeterEB/coap-shepherd');
    console.log('   >>> Copyright (c) 2016 Peter Yi, The MIT License (MIT)');
    console.log('');
    console.log('The server is up and running, press Ctrl+C to stop server.');
    console.log('');
    console.log('---------------------------------------------------------------');
}

/**********************************/
/* goodBye function               */
/**********************************/
function setLeaveMsg() {
    process.stdin.resume();

    function showLeaveMessage() {
        console.log(' ');
        console.log(chalk.blue('      _____              __      __                  '));
        console.log(chalk.blue('     / ___/ __  ___  ___/ /____ / /  __ __ ___       '));
        console.log(chalk.blue('    / (_ // _ \\/ _ \\/ _  //___// _ \\/ // // -_)   '));
        console.log(chalk.blue('    \\___/ \\___/\\___/\\_,_/     /_.__/\\_, / \\__/ '));
        console.log(chalk.blue('                                   /___/             '));
        console.log(' ');
        console.log('    >>> This is a simple demonstration of how the shepherd works.');
        console.log('    >>> Please visit the link to know more about this project:   ');
        console.log('    >>>   ' + chalk.yellow('https://github.com/PeterEB/coap-shepherd'));
        console.log(' ');
        process.exit();
    }

    process.on('SIGINT', showLeaveMessage);
}

module.exports = serverApp;
