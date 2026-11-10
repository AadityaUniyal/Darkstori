import React from 'react';
import PropTypes from 'prop-types';

const EmptyState = ({
  title = "No Data Found",
  description = "There are no records matching your criteria.",
  icon: Icon,
  action,
  actionText = "Reset Filters",
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card/20 rounded-xl border border-dashed border-border/60 my-4">
      {Icon && (
        <div className="p-3 bg-primary/10 rounded-full text-primary mb-3">
          <Icon size={32} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action || (onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          {actionText}
        </button>
      ))}
    </div>
  );
};

EmptyState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  action: PropTypes.node,
  actionText: PropTypes.string,
  onAction: PropTypes.func,
};

export default EmptyState;
