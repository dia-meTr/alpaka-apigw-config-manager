import React from 'react';
import FormRenderer from './FormRenderer';
import './FormSection.css';

const FormSection = ({ element, formData, errors, onChange, path, isRepeatable }) => {
  const { id, props, children } = element;
  const sectionName = props.name;
  const sectionPath = path ? `${path}.${sectionName}` : sectionName;

  // Get array of section instances (for repeatable sections)
  const sectionInstances = getNestedValue(formData, sectionPath);
  const instances = isRepeatable 
    ? (Array.isArray(sectionInstances) ? sectionInstances : [{}])
    : [{}];

  const handleAddSection = () => {
    const currentValue = getNestedValue(formData, sectionPath) || [];
    const newValue = Array.isArray(currentValue) 
      ? [...currentValue, {}]
      : [{}, {}];
    onChange(sectionPath, newValue);
  };

  const handleRemoveSection = (index) => {
    const currentValue = getNestedValue(formData, sectionPath) || [];
    if (Array.isArray(currentValue) && currentValue.length > 1) {
      const newValue = currentValue.filter((_, i) => i !== index);
      onChange(sectionPath, newValue);
    }
  };

  const handleFieldChange = (instanceIndex, fieldName, value) => {
    const currentValue = getNestedValue(formData, sectionPath);
    
    if (isRepeatable) {
      const newInstances = Array.isArray(currentValue) ? [...currentValue] : [{}];
      if (!newInstances[instanceIndex]) {
        newInstances[instanceIndex] = {};
      }
      // Preserve existing fields in this instance
      newInstances[instanceIndex] = {
        ...newInstances[instanceIndex],
        [fieldName]: value
      };
      onChange(sectionPath, newInstances);
    } else {
      // Non-repeatable section - preserve all existing fields
      const existingSectionData = currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)
        ? currentValue
        : {};
      const newSectionData = {
        ...existingSectionData,
        [fieldName]: value
      };
      onChange(sectionPath, newSectionData);
    }
  };

  return (
    <div className="form-section-wrapper">
      {instances.map((instanceData, instanceIndex) => (
        <div key={instanceIndex} className="form-section-container">
          <div className="form-section-header">
            <h3 className="form-section-title">
              {props.title}
              {isRepeatable && instances.length > 1 && (
                <span className="section-instance-number"> (#{instanceIndex + 1})</span>
              )}
            </h3>
            {isRepeatable && instances.length > 1 && (
              <button
                type="button"
                className="btn-remove-section"
                onClick={() => handleRemoveSection(instanceIndex)}
                title="Remove this section"
              >
                ✕
              </button>
            )}
          </div>

          <div className="form-section-content">
            {children && children.map((child) => {
              const childPath = isRepeatable 
                ? `${sectionPath}.${instanceIndex}.${child.props.name}`
                : `${sectionPath}.${child.props.name}`;
              
              return (
                <FormRenderer
                  key={`${child.id}-${instanceIndex}`}
                  element={child}
                  formData={formData}
                  errors={errors}
                  onChange={(fieldPath, value) => {
                    // FormRenderer passes (fieldPath, value) - use the value
                    handleFieldChange(instanceIndex, child.props.name, value);
                  }}
                  path={isRepeatable ? `${sectionPath}.${instanceIndex}` : sectionPath}
                />
              );
            })}
          </div>
        </div>
      ))}

      {isRepeatable && (
        <button
          type="button"
          className="btn-add-section"
          onClick={handleAddSection}
        >
          + Add {props.title}
        </button>
      )}
    </div>
  );
};

const getNestedValue = (obj, path) => {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
};

export default FormSection;

