import dynamic from 'next/dynamic';

// Dynamically import Recharts components with SSR disabled
export const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
export const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
export const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
export const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
export const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
export const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
export const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
export const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
export const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
export const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
export const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
export const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
export const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
export const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
export const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
