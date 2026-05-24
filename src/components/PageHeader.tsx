interface PageHeaderProps {
  title: string;
  lead?: string;
}

export default function PageHeader({ title, lead }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h2>{title}</h2>
      {lead && <p className="page-lead">{lead}</p>}
    </header>
  );
}
