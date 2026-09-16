import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { useMemo } from 'react';

type Props = {
  data: number[];
  positive?: boolean;
  height?: number;
  width?: number;
  strokeWidth?: number;
};

export function Sparkline({ data, positive = true, height = 36, width = 96, strokeWidth = 1.5 }: Props) {
  const chartData = useMemo(() => data.map((v, i) => ({ i, v })), [data]);
  const color = positive ? '#16c784' : '#ea3943';
  const id = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
