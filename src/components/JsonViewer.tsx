import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  className?: string;
  collapsed?: boolean;
}

export function JsonViewer({ data, className, collapsed = false }: JsonViewerProps) {
  const formatJson = (obj: unknown, indent = 0): React.ReactNode => {
    if (obj === null) return <span className="text-muted-foreground">null</span>;
    if (obj === undefined) return <span className="text-muted-foreground">undefined</span>;
    
    if (typeof obj === 'string') {
      return <span className="text-success">"{obj}"</span>;
    }
    if (typeof obj === 'number') {
      return <span className="text-info">{obj}</span>;
    }
    if (typeof obj === 'boolean') {
      return <span className="text-warning">{obj.toString()}</span>;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span>[]</span>;
      return (
        <span>
          {'[\n'}
          {obj.map((item, i) => (
            <span key={i}>
              {'  '.repeat(indent + 1)}
              {formatJson(item, indent + 1)}
              {i < obj.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          ))}
          {'  '.repeat(indent)}
          {']'}
        </span>
      );
    }
    
    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return <span>{'{}'}</span>;
      return (
        <span>
          {'{\n'}
          {entries.map(([key, value], i) => (
            <span key={key}>
              {'  '.repeat(indent + 1)}
              <span className="text-primary">"{key}"</span>
              {': '}
              {formatJson(value, indent + 1)}
              {i < entries.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          ))}
          {'  '.repeat(indent)}
          {'}'}
        </span>
      );
    }
    
    return <span>{String(obj)}</span>;
  };

  return (
    <pre className={cn('code-block text-xs leading-relaxed', className)}>
      <code>{formatJson(data)}</code>
    </pre>
  );
}
