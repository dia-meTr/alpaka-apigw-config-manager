import React from 'react';
import './FormInput.css';

const FormInput = ({ id, props, value = '', error, onChange }) => {
  const {
    label,
    name,
    required,
    dataType = 'text',
    placeholder,
    helpText
  } = props;

  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Convert to number if dataType is number
    if (dataType === 'number') {
      newValue = newValue === '' ? '' : (isNaN(Number(newValue)) ? value : Number(newValue));
    }
    
    onChange(newValue);
  };

  const inputType = dataType === 'url' ? 'url' : dataType === 'number' ? 'number' : 'text';

  return (
    <div className="form-input-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={inputType}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={`form-input ${error ? 'error' : ''}`}
      />
      {helpText && <span className="help-text">{helpText}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default FormInput;

