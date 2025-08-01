import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-accent-blue",
  valueColor = "text-gray-900",
  subtitleColor = "text-gray-600",
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-gray-700">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
        {subtitle && <p className={`text-sm mt-1 ${subtitleColor}`}>{subtitle}</p>}
      </CardContent>
    </Card>
  )
} 