import React from 'react';
import './FormCheckbox.css';

const FormCheckbox = ({ id, props, value = false, error, onChange }) => {
  const { label, name, required } = props;

  const handleChange = (e) => {
    onChange(e.target.checked);
  };

  return (
    <div className="form-checkbox-group">
      <label htmlFor={id} className="form-checkbox-label">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={value}
          onChange={handleChange}
          required={required}
          className={`form-checkbox ${error ? 'error' : ''}`}
        />
        <span className="checkbox-label-text">
          {label}
          {required && <span className="required">*</span>}
        </span>
      </label>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default FormCheckbox;

