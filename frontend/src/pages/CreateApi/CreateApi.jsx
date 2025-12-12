import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormRenderer from '../../components/FormRenderer/FormRenderer';
import apiProps from '../../config/apiProps.json';
import './CreateApi.css';

const CreateApi = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Initialize form data structure based on apiProps
  useEffect(() => {
    const initialData = {};
    
    apiProps.elements.forEach((element) => {
      if (element.type === 'Section') {
        const sectionName = element.props.name;
        
        if (element.isRepeatable) {
          // Initialize repeatable sections as array with one empty object
          initialData[sectionName] = [{}];
        } else {
          // Initialize non-repeatable sections as empty object
          initialData[sectionName] = {};
        }
        
        // Initialize children fields
        if (element.children) {
          element.children.forEach((child) => {
            const fieldName = child.props.name;
            if (element.isRepeatable) {
              initialData[sectionName][0][fieldName] = getDefaultValue(child);
            } else {
              initialData[sectionName][fieldName] = getDefaultValue(child);
            }
          });
        }
      }
    });
    
    setFormData(initialData);
  }, []);

  const getDefaultValue = (element) => {
    if (element.type === 'Select' && element.props.defaultValue !== undefined) {
      return element.props.defaultValue;
    }
    if (element.type === 'Checkbox') {
      return false;
    }
    if (element.type === 'Input' && element.props.dataType === 'number') {
      return '';
    }
    return '';
  };

  const handleFieldChange = (fieldPath, value) => {
    setFormData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev)); // Deep clone
      const keys = fieldPath.split('.');
      
      // If value is an object or array, it means we're updating an entire section
      // (from FormSection component). In that case, set it directly.
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0 && keys.length === 1) {
        // This is a section-level update (e.g., "service" with entire service object)
        newData[fieldPath] = value;
        return newData;
      }
      
      if (Array.isArray(value) && keys.length === 1) {
        // This is a repeatable section update (e.g., "routes" with array)
        newData[fieldPath] = value;
        return newData;
      }
      
      // Handle nested field paths like "service.name" or "routes.0.name"
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        // Check if key is a number (array index)
        if (!isNaN(key)) {
          const index = parseInt(key);
          if (!Array.isArray(current)) {
            current = [];
          }
          while (current.length <= index) {
            current.push({});
          }
          if (!current[index]) {
            current[index] = {};
          }
          current = current[index];
        } else {
          if (!current[key] || typeof current[key] !== 'object') {
            // Determine if this should be an object or array
            // Check next key to see if it's a number
            const nextKey = keys[i + 1];
            current[key] = !isNaN(nextKey) ? [] : {};
          }
          current = current[key];
        }
      }
      
      const lastKey = keys[keys.length - 1];
      if (Array.isArray(current) && !isNaN(lastKey)) {
        const index = parseInt(lastKey);
        while (current.length <= index) {
          current.push({});
        }
        if (!current[index]) {
          current[index] = {};
        }
        current[index] = value;
      } else if (current && typeof current === 'object') {
        current[lastKey] = value;
      } else {
        // Fallback: create the path
        newData[fieldPath] = value;
      }
      
      return newData;
    });

    // Clear error for this field when user starts typing
    if (errors[fieldPath]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldPath];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const validateElement = (element, data, path = '') => {
      const fieldPath = path ? `${path}.${element.props?.name || element.id}` : (element.props?.name || element.id);
      
      // Check dependencies
      if (element.dependencies?.showIf) {
        const { field, value } = element.dependencies.showIf;
        // Try relative path first (within the same section)
        let fieldValue = getNestedValue(data, path ? `${path}.${field}` : field);
        // If not found, try absolute path
        if (fieldValue === undefined) {
          fieldValue = getNestedValue(data, field);
        }
        if (fieldValue !== value) {
          return; // Skip validation if dependency not met
        }
      }
      
      // Validate required fields
      if (element.props?.required) {
        const value = getNestedValue(data, fieldPath);
        // Handle empty string, null, undefined, or empty arrays
        const isEmpty = value === undefined || 
                       value === '' || 
                       value === null || 
                       (Array.isArray(value) && value.length === 0) ||
                       (typeof value === 'number' && isNaN(value));
        
        if (isEmpty) {
          newErrors[fieldPath] = `${element.props.label || fieldPath} is required`;
        }
      }
      
      // Validate URL type
      if (element.type === 'Input' && element.props.dataType === 'url') {
        const value = getNestedValue(data, fieldPath);
        if (value && !/^https?:\/\/.+/.test(value)) {
          newErrors[fieldPath] = 'Must be a valid HTTP/HTTPS URL';
        }
      }
      
      // Recursively validate children
      if (element.children) {
        element.children.forEach((child) => {
          validateElement(child, data, path);
        });
      }
    };
    
    // Validate all elements
    apiProps.elements.forEach((element) => {
      if (element.type === 'Section') {
        const sectionName = element.props.name;
        const sectionData = formData[sectionName];
        
        if (element.isRepeatable && Array.isArray(sectionData)) {
          sectionData.forEach((instance, index) => {
            if (element.children) {
              element.children.forEach((child) => {
                const childPath = `${sectionName}.${index}.${child.props.name}`;
                validateElement(child, formData, `${sectionName}.${index}`);
              });
            }
          });
        } else {
          if (element.children) {
            element.children.forEach((child) => {
              validateElement(child, formData, sectionName);
            });
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setSubmitError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:80/newapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to create API';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json().catch(() => ({}));
      
      // Success - navigate back to team
      navigate(`/team/${teamId}`);
    } catch (error) {
      console.error('Error creating API:', error);
      setSubmitError(error.message || 'Failed to create API. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!apiProps || !apiProps.elements) {
    return (
      <div className="create-api">
        <div className="error">Error loading form configuration</div>
      </div>
    );
  }

  return (
    <div className="create-api">
      <div className="create-api-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>{apiProps.pageTitle || 'Create New API'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="create-api-form">
        {apiProps.elements.map((element) => (
          <FormRenderer
            key={element.id}
            element={element}
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
          />
        ))}

        {submitError && (
          <div className="submit-error">
            {submitError}
          </div>
        )}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create API'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateApi;
