interface PagePlaceholderProps {
  title: string
  description: string
}

export default function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="mx-auto max-w-6xl">
      <p className="eyebrow">SMART FARM MINI</p>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">{description}</p>
      <div className="panel mt-8">
        <h2 className="text-lg font-semibold">Chưa có dữ liệu</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Chức năng đang được chuẩn bị. Dữ liệu sẽ hiển thị sau khi tích hợp hệ thống.</p>
      </div>
    </section>
  )
}
