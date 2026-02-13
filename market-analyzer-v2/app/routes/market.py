# app/routes/market.py

from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import auth_required
from app.services.market_service import MarketService

market_bp = Blueprint("market", __name__)


def _get_market_service():
    return MarketService(current_app.mongo)


@market_bp.route("/symbols")
@auth_required
def symbols():
    type_filter = request.args.get("type", "all")
    try:
        market_service = _get_market_service()
        symbols = market_service.get_symbols(type_filter)
        return jsonify(symbols), 200
    except Exception:
        current_app.logger.exception("Failed to fetch symbols")
        return jsonify({"error": "Failed to fetch symbols"}), 500


@market_bp.route("/ohlcv")
@auth_required
def ohlcv():
    symbol = request.args.get("symbol")
    interval = request.args.get("interval", "1d")
    if not symbol:
        return jsonify({"error": "Missing 'symbol' query param"}), 400

    try:
        market_service = _get_market_service()
        data = market_service.get_ohlcv(symbol, interval)
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to fetch OHLCV")
        return jsonify({"error": "Failed to fetch OHLCV"}), 500


@market_bp.route("/realtime/<symbol>")
@auth_required
def realtime(symbol):
    try:
        market_service = _get_market_service()
        data = market_service.get_ohlcv(symbol, "1m")
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to fetch realtime data")
        return jsonify({"error": "Failed to fetch realtime data"}), 500
