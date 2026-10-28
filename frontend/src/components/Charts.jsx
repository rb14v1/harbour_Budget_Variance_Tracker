import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPaise, formatPaiseCompact } from '../utils/format';

export function TrendChart({ data, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={formatPaiseCompact} width={80} />
        <Tooltip formatter={(v) => formatPaise(v)} />
        <Legend />
        <Line type="monotone" dataKey="budget" name="Budget" stroke="#1976d2" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="actual" name="Actual" stroke="#ed6c02" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BudgetActualBarChart({ data, labelKey = 'label', height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={labelKey} interval={0} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatPaiseCompact} width={80} />
        <Tooltip formatter={(v) => formatPaise(v)} />
        <Legend />
        <Bar dataKey="budget" name="Budget" fill="#1976d2" />
        <Bar dataKey="actual" name="Actual" fill="#ed6c02" />
      </BarChart>
    </ResponsiveContainer>
  );
}
