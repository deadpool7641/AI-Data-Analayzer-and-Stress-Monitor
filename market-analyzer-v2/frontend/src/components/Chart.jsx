import { Chart as ApexChart } from 'react-apexcharts'

export default function Chart({ data, type = 'line' }) {
  const options = {
    chart: { type },
    xaxis: { type: 'datetime' },
    yaxis: { title: { text: 'Price' } }
  }
  
  return (
    <ApexChart 
      options={options} 
      series={[{ name: 'Price', data }]} 
      height={350} 
      type={type}
    />
  )
}
