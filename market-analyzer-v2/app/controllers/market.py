from flask import request, jsonify
from flask import current_app

def symbols():
    type_filter = request.args.get('type', 'all')
    return jsonify(current_app.market_service.get_symbols(type_filter))

def ohlcv():
    symbol = request.args.get('symbol')
    return jsonify(current_app.market_service.get_ohlcv(symbol))
