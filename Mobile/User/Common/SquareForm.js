'use strict';

import React, {
    Component,
    PropTypes,
} from 'react';

import {
    Alert,
    Dimensions,
    StyleSheet,
    View,
    Platform,
    WebView
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import TSModal from 'shared-modules/TSModal';
import Button from 'shared-modules/Button';

const LOCAL_HOST_NONCE = 'https://localhost/nonce/';

const {width: screenWidth} = Dimensions.get('window');

export default class extends Component {
    static propTypes = {
        squareAppId: PropTypes.string.isRequired,
        amount: PropTypes.string.isRequired,
        onSuccess: PropTypes.func.isRequired,
        onError: PropTypes.func.isRequired,
        onCancel: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this._html = `
       <html>
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,user-scalable=yes,initial-scale=1.0,minimum-scale=1.0">
        <link rel='stylesheet prefetch' href='https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css'>
        <title>Square Payment Form</title>
        <script type="text/javascript" src="https://js.squareup.com/v2/paymentform">
        </script>
        <script>

        const paymentForm = new SqPaymentForm({
        applicationId: '${this.props.squareAppId}',
        inputClass: 'sq-input',
        inputStyles: [
            {
                fontSize: '1em',
                color: '#5A5B5D',
            }
        ],
        cardNumber: {
            elementId: 'sq-card-number',
            placeholder: '•••• •••• •••• ••••'
        },
        cvv: {
            elementId: 'sq-cvv',
            placeholder: 'CVV'
        },
        expirationDate: {
            elementId: 'sq-expiration-date',
            placeholder: 'MM/YY'
        },
        postalCode: {
            elementId: 'sq-postal-code'
        },
        callbacks: {
            cardNonceResponseReceived: function(errors, nonce, cardData) {
                if (errors && errors.length > 0) {
                    errors.forEach(function(err) {
                        switch(err.field) {
                              case 'cardNumber':
                                  document.getElementById("sq-card-number").className += " sq-input--error";
                                  break;
                              case 'cvv':
                                  document.getElementById("sq-cvv").className += " sq-input--error";
                                  break;
                              case 'expirationDate':
                                  document.getElementById("sq-expiration-date").className += " sq-input--error";
                                  break;
                              case 'postalCode':
                                  document.getElementById("sq-postal-code").className += " sq-input--error";
                                  break;
                        }
                    });
                } else {
                    window.location.replace(encodeURI('${LOCAL_HOST_NONCE}' + nonce));
                }
            },

            unsupportedBrowserDetected: function() {
            },

            inputEventReceived: function(inputEvent) {
            },

            paymentFormLoaded: function() {
            }
        }
    });

    function requestCardNonce(event) {
        event.preventDefault();
        document.getElementById("sq-card-number").className = "sq-input";
        document.getElementById("sq-cvv").className = "sq-input";
        document.getElementById("sq-expiration-date").className = "sq-input";
        document.getElementById("sq-postal-code").className = "sq-input";
        paymentForm.requestCardNonce();
    }
</script>

    <style type="text/css">
        .sq-input {
        border: 1px solid rgb(223, 223, 223);
        margin-bottom: 0.5em;
        padding: 0.5em;
        padding-left: 0em;
    }
        .sq-input--focus {
        outline: 5px auto rgb(59, 153, 252);
    }
        .sq-input--error {
        outline: none;
        border-color: #df9eed;
        box-shadow: 0 0 10px #df9eed;
    }
    .form-header {
        padding: 0.5em;
        border-bottom: 1px solid #A9B1B9;
        text-align: center;
    }
    .form-body {
        padding: 0.5em;
        padding-top: 1em;
    }
    .display-flex {
        display: -webkit-flex; /* Safari */;
        display: flex;
    }
    .flex1 {
        -webkit-flex: 1; /* Safari 6.1+ */
        flex: 1;
    }
        label {
            font-size: 1em;
            font-weight: bold;
            color: #5A5B5D;
        }
    .btnSumbit {
        width: 100%;
        border-radius: 6px;
        border-color: transparent;
        font-size: 1.5em;
        color: #FFF;
        background: #7dc855;
        margin-top: 0.7em;
        padding: 0.5em;
    }    
    </style>
</head>

    <body>

    <div class="form-header">
    <label>Secure Payment</label>
    </div>
    <div class="form-body">
    <div class="display-flex">
    <div class="flex1">
    <label>Card Number</label>
    <div id="sq-card-number"></div>
    </div>
    <div style="width:4em; margin-left: 1em">
    <label>CVV</label>
    <div id="sq-cvv"></div>
    </div>
    </div>
    <div class="display-flex">
    <div class="flex1">
    <label>Expiration Date</label>
    <div id="sq-expiration-date"></div>
    </div>
    <div class="flex1" style="margin-left: 1em">
    <label>Postal Code</label>
    <div id="sq-postal-code"></div>
    </div>
    </div>
    
    <button class="btnSumbit" onClick="requestCardNonce(event)"><i class="ion-locked"></i> Pay ${this.props.amount}</button>
    <div style="text-align:center">
    <h6 style="color: #5A5B5D; display: inline-block; vertical-align: middle;"><i>Powered by Square</i></h6>
    <div style="height: 1em; width: 1em; display: inline-block; vertical-align: middle;">
    <svg aria-labeledby="square-logo-title square-logo-desc" class="reset" role="img" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><title id="square-logo-title">Square</title><desc id="square-logo-desc">Accept Credit Cards From An iPhone, Android or iPad - Square</desc><path d="M36.65 0h-29.296c-4.061 0-7.354 3.292-7.354 7.354v29.296c0 4.062 3.293 7.354 7.354 7.354h29.296c4.062 0 7.354-3.292 7.354-7.354v-29.296c.001-4.062-3.291-7.354-7.354-7.354zm-.646 33.685c0 1.282-1.039 2.32-2.32 2.32h-23.359c-1.282 0-2.321-1.038-2.321-2.32v-23.36c0-1.282 1.039-2.321 2.321-2.321h23.359c1.281 0 2.32 1.039 2.32 2.321v23.36z" role="presentation"></path><path d="M17.333 28.003c-.736 0-1.332-.6-1.332-1.339v-9.324c0-.739.596-1.339 1.332-1.339h9.338c.738 0 1.332.6 1.332 1.339v9.324c0 .739-.594 1.339-1.332 1.339h-9.338z" role="presentation"></path>
    </svg>
    </div>
    </div>
    </div>
    
    </body>
    </html>`;
    }

    render() {
        return (
            <TSModal visible={true} width={screenWidth - 10} position="top">
                <View style={styles.modal}>
                    <WebView automaticallyAdjustContentInsets={true}
                             style={styles.webview}
                             javaScriptEnabled={true}
                             source={{html: this._html, baseUrl: 'https://localhost/square'}}
                             onNavigationStateChange={this._onNavigationStateChange.bind(this)}
                             onShouldStartLoadWithRequest={this._onShouldStartLoadWithRequest.bind(this)}
                             startInLoadingState={true}
                             scrollEnabled={false}
                             scalesPageToFit={false}/>
                </View>
                <Button onPress={this._close.bind(this)} containerStyle={styles.closeButton}>
                    <Ionicons name={(Platform.OS === 'ios' ? 'ios' : 'md') + '-close'} color="#3B709F" size={40}/>
                </Button>
            </TSModal>
        );
    }

    _onNavigationStateChange(navState) {
        if (Platform.OS === 'android') {
            this._handleURL(decodeURI(navState.url));
        }
    }

    _onShouldStartLoadWithRequest(event) {
        if (Platform.OS === 'ios') {
            return this._handleURL(decodeURI(event.url));
        }

        return true;
    }

    _handleURL(url) {
        if (url.startsWith(LOCAL_HOST_NONCE)) {
            this.props.onSuccess(url.slice(LOCAL_HOST_NONCE.length));
            return false;
        }

        return true;
    }

    _close() {
        this.props.onCancel();
    }
}

const styles = StyleSheet.create({
    webview: {
        flex: 1
    },
    modal: {
        height: 320,
    },
    closeButton: {
        top: 1,
        left: 10,
        position: 'absolute',
        backgroundColor: 'transparent'
    }
});