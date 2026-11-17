import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  onPageChange: (page: number) => void
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null
  const endItem =
    totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#f0f3f0] ${className}`}
    >
      <div className="text-xs text-[#647067]">
        {startItem && endItem && totalItems ? (
          <span>
            Hiển thị <span className="font-semibold text-[#17251d]">{startItem}</span> -{' '}
            <span className="font-semibold text-[#17251d]">{endItem}</span> trên{' '}
            <span className="font-semibold text-[#17251d]">{totalItems}</span> bản ghi
          </span>
        ) : (
          <span>
            Trang <span className="font-semibold text-[#17251d]">{currentPage}</span> /{' '}
            <span className="font-semibold text-[#17251d]">{totalPages}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Trước</span>
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1
            // Simple windowing: show current, first, last, and immediate neighbors
            if (
              totalPages > 6 &&
              pageNum !== 1 &&
              pageNum !== totalPages &&
              Math.abs(pageNum - currentPage) > 1
            ) {
              if (pageNum === 2 || pageNum === totalPages - 1) {
                return (
                  <span
                    key={pageNum}
                    className="px-1 text-xs text-[#8a968d] select-none"
                  >
                    ...
                  </span>
                )
              }
              return null
            }

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`size-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-[#15803d] text-white font-semibold'
                    : 'text-[#647067] hover:bg-[#f1f5f1] hover:text-[#17251d]'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

