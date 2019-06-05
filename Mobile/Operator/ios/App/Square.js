'use strict';

import {
    NativeModules
} from 'react-native';

import numeral from 'numeral';

class Square {
    constructor() {
        this._token = undefined;
        this._locationId = undefined;
        this._currencySymbol = NativeModules.SettingsManager.settings.AppleLocale === 'en_US' ? 'USD' : 'CAD';
    }

    get locationId() {
        return this._locationId;
    }

    setAccessToken(token, onCompleted) {
        this._token = token;
        fetch('https://connect.squareup.com/v2/locations', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this._token}`
            }
        }).then(response => {
            if (response.status === 200) {
                return response.json();
            } else {
                throw new Error('Something went wrong on api server!');
            }
        }).then(locations => {
            if (locations.hasOwnProperty("locations") && locations.locations.length > 0) {
                onCompleted();
                this._locationId = locations.locations[0].id;
            } else {
                onCompleted(false);
            }
        }).catch(e => onCompleted(false));
    }

    // SquareCheckout from User's OrderStatus page
    // amount: order.total,
    // nonce: nonce,
    // orderId: order.orderId,
    // operatorId: order.operatorId
    checkout(checkout, onSuccess, onError) {
        if (!this._locationId) {
            onError({'code': 'no_location_id', 'detail': 'no_location_id'});
            return;
        }
        //{
        //    "transaction": {
        //        "id": "8f7bb0e0-6857-5897-515b-f3cfbba76785",
        //        "location_id": "CBASEFbB4d3a6t-3fe4TwCg95e8gAQ",
        //        "created_at": "2017-02-18T18:40:38Z",
        //        "tenders": [{
        //            "id": "13ee8ffb-52d2-5af6-7d2e-108045c55f37",
        //            "location_id": "CBASEFbB4d3a6t-3fe4TwCg95e8gAQ",
        //            "transaction_id": "8f7bb0e0-6857-5897-515b-f3cfbba76785",
        //            "created_at": "2017-02-18T18:40:38Z",
        //            "note": "Online Transaction",
        //            "amount_money": {"amount": 699, "currency": "USD"},
        //            "type": "CARD",
        //            "card_details": {
        //                "status": "CAPTURED",
        //                "card": {"card_brand": "VISA", "last_4": "5858"},
        //                "entry_method": "KEYED"
        //            }
        //        }],
        //        "product": "EXTERNAL_API"
        //    }
        //    "errors": [{
        //        "category": "INVALID_REQUEST_ERROR",
        //        "code": "IDEMPOTENCY_KEY_REUSED",
        //        "detail": "The idempotency key can only be retried with the same request data.",
        //        "field": "idempotency_key"
        //    }]
        //};
        fetch(`https://connect.squareup.com/v2/locations/${this._locationId}/transactions`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._token}`
            },
            body: JSON.stringify({
                'card_nonce': checkout.nonce,
                'amount_money': {
                    'amount': Math.round(checkout.amount * 100),
                    'currency': this._currencySymbol
                },
                'idempotency_key': checkout.orderId
            })
        }).then(response => response.json())
            .then(tx => tx.hasOwnProperty("transaction") ? onSuccess(tx.transaction, this._toDollarAmount(tx))
                : onError(tx.errors))
            .catch(e => onError(e))
    }

    _toDollarAmount(tx) {
        return numeral(tx.transaction.tenders.reduce((amt, tender) => amt + tender.amount_money.amount, 0))
            .divide(100).value();
    }
}

export default new Square();
