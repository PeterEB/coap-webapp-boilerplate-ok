import request from 'superagent';
import React from 'react';
import ReactDOM from 'react-dom';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import injectTapEventPlugin from 'react-tap-event-plugin';

import ioClient from './helpers/ioClient';

import NavBar from './components/NavBar/NavBar';
import CardBlock from './components/CardBlock/CardBlock';

var title = 'coap-shepherd',
    permitJoinTime = 60;

ioClient.start('http://' + window.location.hostname + ':3030');

/*********************************************/
/* Private Functions                         */
/*********************************************/
function ioConnectedDelay (callback) {
    if (ioClient._connected) {
        callback();
    } else {
        setTimeout(function () {
            ioConnectedDelay(callback);
        }, 1000);
    }
}

/*********************************************/
/* App component                             */
/*********************************************/
var App = React.createClass({
    getInitialState: function () {
        return {
            devs: {},
            timeLeft: 0
        };
    },

    componentDidMount: function () {
        var self = this;

        ioConnectedDelay(function () {
            // 發送 getDevs 的 request 請求至 Server 端
            // [TODO]
            ioClient.sendReq('getDevs', {}, function (err, data) {
                if (err) {
                    console.log(err);
                } else {
                    self.setState({
                        devs: data
                    });
                }
            });
        });

        // 監聽 permitJoining 事件，並改變 component 的狀態
        ioClient.on('permitJoining', function (msg) {
            // msg = { timeLeft }
            // [TODO]
            self.setState({
                timeLeft: msg.timeLeft
            });
        });

        // 監聽 devIncoming 事件，並改變 component 的狀態
        ioClient.on('devIncoming', function (msg) {
            // msg =  { dev }
            // [TODO]
            self.setState({
                devs: { ...self.state.devs, [msg.dev.permAddr]: msg.dev }
            });
        });

        // 監聽 devStatus 事件，並改變 component 的狀態
        ioClient.on('devStatus', function (msg) {
            // msg = { permAddr, status }
            // [TODO]
            self.setState({
                devs: {
                    ...self.state.devs,
                    [msg.permAddr]: {
                        ...self.state.devs[msg.permAddr],
                        status: msg.status
                    }
                }
            });
        });

        // 監聽 attrsChange 事件，並改變 component 的狀態
        ioClient.on('attrsChange', function (msg) {
            // msg = { permAddr, gad } 
            // [TODO]
            self.setState({
                devs: {
                    ...self.state.devs,
                    [msg.permAddr]: {
                        ...self.state.devs[msg.permAddr],
                        gads: {
                            ...self.state.devs[msg.permAddr].gads,
                            [msg.gad.auxId]: msg.gad
                        }
                    }
                }
            });
        });
    },

    // 發送 permitJoin 的 request 請求至 Server 端
    onPermitCallback: function () {
        // [TODO]
        ioClient.sendReq('permitJoin', { time: 60 }, function (err, data) {
            if (err)
                console.log(err);
        });
    },

    // 發送 write 的 request 請求至 Server 端
    onWriteCallback: function (permAddr, auxId, value) {
        // [TODO]
        return function () {
            var args = { permAddr: permAddr, auxId: auxId, value: value };
            ioClient.sendReq('write', args, function (err, data) {
                if (err)
                    console.log(err); 
            });
        }
    },

    render: function () {
        return (
            <MuiThemeProvider>
                <div>
                    <NavBar title={this.props.title} timeLeft={this.state.timeLeft} onClick={this.onPermitCallback} />
                    <CardBlock devs={this.state.devs} onClick={this.onWriteCallback}/>
                </div>     
            </MuiThemeProvider>
        );
    }
});

/*********************************************/
/* render                                    */
/*********************************************/
ReactDOM.render(<App title={title} />, document.getElementById('root'));
