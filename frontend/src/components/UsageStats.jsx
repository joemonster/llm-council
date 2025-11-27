import React from 'react';
import './UsageStats.css';

function UsageStats({ usage }) {
  if (!usage) return null;

  const formatNumber = (num) => {
    return num.toLocaleString('en-US');
  };

  const formatCost = (cost) => {
    return `$${cost.toFixed(4)}`;
  };

  const renderStageUsage = (stageUsage, stageName) => {
    if (!stageUsage || !stageUsage.models || stageUsage.models.length === 0) {
      return null;
    }

    return (
      <details className="usage-stage">
        <summary className="usage-stage-summary">
          <span className="usage-stage-name">{stageName}</span>
          <span className="usage-stage-stats">
            <span className="usage-stat-item">
              {formatNumber(stageUsage.total_tokens)} tokens
            </span>
            <span className="usage-stat-item usage-cost">
              {formatCost(stageUsage.total_cost)}
            </span>
          </span>
        </summary>
        <div className="usage-models">
          {stageUsage.models.map((model, index) => (
            <div key={index} className="usage-model">
              <div className="usage-model-name">{model.model}</div>
              <div className="usage-model-stats">
                <div className="usage-model-stat">
                  <span className="usage-label">Prompt:</span>
                  <span className="usage-value">{formatNumber(model.prompt_tokens)}</span>
                </div>
                <div className="usage-model-stat">
                  <span className="usage-label">Completion:</span>
                  <span className="usage-value">{formatNumber(model.completion_tokens)}</span>
                </div>
                <div className="usage-model-stat">
                  <span className="usage-label">Total:</span>
                  <span className="usage-value">{formatNumber(model.total_tokens)}</span>
                </div>
                <div className="usage-model-stat">
                  <span className="usage-label">Cost:</span>
                  <span className="usage-value usage-cost">{formatCost(model.cost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  };

  return (
    <div className="usage-stats">
      <div className="usage-header">Usage Statistics</div>

      {/* Grand Total */}
      <div className="usage-grand-total">
        <div className="usage-grand-total-header">Grand Total</div>
        <div className="usage-grand-total-stats">
          <div className="usage-total-item">
            <span className="usage-total-label">Prompt Tokens:</span>
            <span className="usage-total-value">
              {formatNumber(usage.grand_total.total_prompt_tokens)}
            </span>
          </div>
          <div className="usage-total-item">
            <span className="usage-total-label">Completion Tokens:</span>
            <span className="usage-total-value">
              {formatNumber(usage.grand_total.total_completion_tokens)}
            </span>
          </div>
          <div className="usage-total-item">
            <span className="usage-total-label">Total Tokens:</span>
            <span className="usage-total-value">
              {formatNumber(usage.grand_total.total_tokens)}
            </span>
          </div>
          <div className="usage-total-item usage-total-cost">
            <span className="usage-total-label">Total Cost:</span>
            <span className="usage-total-value usage-cost">
              {formatCost(usage.grand_total.total_cost)}
            </span>
          </div>
        </div>
      </div>

      {/* Stage Breakdowns */}
      <div className="usage-stages">
        {renderStageUsage(usage.stage1, 'Stage 1: Individual Responses')}
        {renderStageUsage(usage.stage2, 'Stage 2: Peer Rankings')}
        {renderStageUsage(usage.stage3, 'Stage 3: Chairman Synthesis')}
      </div>
    </div>
  );
}

export default UsageStats;
