import { useState, useEffect } from 'react'
import api from '../services/api'

export default function useMarketData(symbol) {
  const [data, setData] = useState([])
  
  useEffect(() => {
    if (symbol) {
      api.get(`/market/ohlcv?symbol=${symbol}`).then(res => setData(res.data))
    }
  }, [symbol])
  
  return data
}
