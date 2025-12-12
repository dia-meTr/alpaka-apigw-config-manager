import React from 'react';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import FormCheckbox from './FormCheckbox';
import FormSection from './FormSection';
import './FormRenderer.css';

const FormRenderer = ({ element, formData, errors, onChange, path = '' }) => {
  const { type, id, props, children, isRepeatable, dependencies } = element;
  const fieldPath = path ? `${path}.${props?.name || id}` : (props?.name || id);

  // Check dependencies (conditional rendering)
  if (dependencies?.showIf) {
    const { field, value } = dependencies.showIf;
    
    // Try absolute path first, then relative to current path
    let fieldValue = getNestedValue(formData, field);
    
    if (fieldValue === undefined && path) {
      // Try relative path: path.field (e.g., "plugins.enable_rate_limit")
      const relativePath = `${path}.${field}`;
      fieldValue = getNestedValue(formData, relativePath);
    }
    
    if (fieldValue !== value) {
      return null;
    }
  }

  switch (type) {
    case 'Section':
      return (
        <FormSection
          key={id}
          element={element}
          formData={formData}
          errors={errors}
          onChange={onChange}
          path={path}
          isRepeatable={isRepeatable}
        />
      );
    case 'Input':
      return (
        <FormInput
          key={id}
          id={id}
          props={props}
          value={getNestedValue(formData, fieldPath)}
          error={errors[fieldPath]}
          onChange={(value) => onChange(fieldPath, value)}
        />
      );
    case 'Select':
      return (
        <FormSelect
          key={id}
          id={id}
          props={props}
          value={getNestedValue(formData, fieldPath)}
          error={errors[fieldPath]}
          onChange={(value) => {
            if (onChange.length === 2) {
              onChange(fieldPath, value);
            } else {
              onChange(value);
            }
          }}
        />
      );
    case 'Checkbox':
      return (
        <FormCheckbox
          key={id}
          id={id}
          props={props}
          value={getNestedValue(formData, fieldPath)}
          error={errors[fieldPath]}
          onChange={(value) => {
            if (onChange.length === 2) {
              onChange(fieldPath, value);
            } else {
              onChange(value);
            }
          }}
        />
      );
    default:
      console.warn(`Unknown form element type: ${type}`);
      return null;
  }
};

// Helper function to get nested values from formData
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

export default FormRenderer;

