import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from './Card'
import { Badge } from './Badge'
import { EmptyState } from './EmptyState'
import { Layers } from 'lucide-react'

export interface PagePlaceholderProps {
  pageNumber?: string
  title: string
  route?: string
  description: string
  keyFeatures?: string[]
}

export const PagePlaceholder: React.FC<PagePlaceholderProps> = ({
  pageNumber = 'SẮP RA MẮT',
  title,
  route,
  description,
  keyFeatures = [],
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e5eae5]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="success" size="sm">
              Smart Farm Mini
            </Badge>
            <span className="text-xs font-semibold text-[#647067]">
              {pageNumber}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#17251d]">{title}</h1>
          <p className="text-sm text-[#647067] mt-1">{description}</p>
        </div>

        {route && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="neutral" size="md">
              Route: {route}
            </Badge>
          </div>
        )}
      </div>

      {/* Feature Specification Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Đặc tả giao diện & Chức năng</CardTitle>
            <CardDescription>
              Các thành phần UI và luồng xử lý sẽ được xây dựng ở các giai đoạn tiếp theo
            </CardDescription>
          </div>
        </CardHeader>

        {keyFeatures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {keyFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[#f8faf7] border border-[#e5eae5]"
              >
                <div className="size-2 rounded-full bg-[#15803d]" />
                <span className="text-xs font-medium text-[#17251d]">{feat}</span>
              </div>
            ))}
          </div>
        ) : null}

        <EmptyState
          icon={<Layers className="size-6 text-[#15803d]" />}
          title="Giao diện đang sẵn sàng cho Giai đoạn tiếp theo"
          description="Khung điều hướng, layout, breadcrumb và token màu sắc đã hoàn thành sẵn sàng cho triển khai nghiệp vụ."
        />
      </Card>
    </div>
  )
}

export default PagePlaceholder
