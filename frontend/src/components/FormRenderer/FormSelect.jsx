import React, { useState, useEffect } from 'react';
import './FormSelect.css';

const FormSelect = ({ id, props, value, error, onChange }) => {
  const {
    label,
    name,
    required,
    isMulti = false,
    options = [],
    defaultValue,
    placeholder
  } = props;

  // Initialize with defaultValue if provided and value is empty
  useEffect(() => {
    if (defaultValue !== undefined && (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
      onChange(defaultValue);
    }
  }, []);

  const handleChange = (e) => {
    if (isMulti) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      onChange(selectedOptions);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div className="form-select-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {isMulti ? (
        <select
          id={id}
          name={name}
          multiple
          value={Array.isArray(value) ? value : []}
          onChange={handleChange}
          required={required}
          className={`form-select form-select-multi ${error ? 'error' : ''}`}
          size={Math.min(options.length, 6)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <select
          id={id}
          name={name}
          value={value || ''}
          onChange={handleChange}
          required={required}
          className={`form-select ${error ? 'error' : ''}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {isMulti && value && Array.isArray(value) && value.length > 0 && (
        <span className="selected-count">{value.length} selected</span>
      )}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default FormSelect;

