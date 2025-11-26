import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import './UserMessage.css';

export default function UserMessage({ content }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count lines in content
  const lineCount = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  const shouldCollapse = lineCount > 10;

  // Get first 10 lines for collapsed view
  const collapsedContent = useMemo(() => {
    if (!shouldCollapse) return content;
    return content.split('\n').slice(0, 10).join('\n');
  }, [content, shouldCollapse]);

  return (
    <div className="user-message">
      <div className="message-label">Ty</div>
      <div className="message-content">
        <div className="markdown-content">
          <ReactMarkdown>
            {shouldCollapse && !isExpanded ? collapsedContent : content}
          </ReactMarkdown>
        </div>
        {shouldCollapse && (
          <button
            className="toggle-message-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▲ Zwiń' : '▼ Rozwiń'}
          </button>
        )}
      </div>
    </div>
  );
}
