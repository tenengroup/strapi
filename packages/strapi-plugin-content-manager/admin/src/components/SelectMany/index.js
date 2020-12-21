import React, { memo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { useDrop } from 'react-dnd';

import Select, { createFilter } from 'react-select';
import ItemTypes from '../../utils/ItemTypes';

import { ListShadow, ListWrapper } from './components';
import ListItem from './ListItem';

function SelectMany({
  addRelation,
  mainField,
  name,
  isDisabled,
  isLoading,
  move,
  nextSearch,
  onInputChange,
  onMenuClose,
  onMenuScrollToBottom,
  onRemove,
  options,
  placeholder,
  targetModel,
  value,
}) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const [, drop] = useDrop({ accept: ItemTypes.RELATION });
  const findRelation = id => {
    const relation = value.filter(c => {
      return `${c.id}` === `${id}`;
    })[0];

    return {
      relation,
      index: value.indexOf(relation),
    };
  };

  const moveRelation = useCallback(
    (id, atIndex) => {
      const { index } = findRelation(id);

      move(index, atIndex, name);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  );

  const filterConfig = {
    ignoreCase: true,
    ignoreAccents: true,
    trim: false,
    matchFrom: 'any',
  };

  const selectAllOption = {
    label: "Select All",
    value: "*"
  }

  const isSelectAllSelected = () => {
    return valueRef.current.length === options.length;
  }
  const getOptions = () => isSelectAllSelected() ? [] : [selectAllOption, ...options];
  const onChange = (newValue, actionMeta) => {
    const { action, option, removedValue } = actionMeta;
    if (action === "select-option" && option.value === selectAllOption.value) {
      for (const optionToAdd of options) {
        if (valueRef.current.every(x => x.id !== optionToAdd.value.id)) {
          addRelation([optionToAdd], actionMeta);
        }
      }
    } else if (
      (action === "deselect-option" &&
        option.value === selectAllOption.value) ||
      (action === "remove-value" &&
        removedValue.value === selectAllOption.value)
    ) {
      addRelation([], actionMeta);
    } else if (
      actionMeta.action === "deselect-option" &&
      isSelectAllSelected()
    ) {
      addRelation(
        options.filter(({ value }) => value !== option.value),
        actionMeta
      );
    } else {
      addRelation(newValue || [], actionMeta);
    }
  };

  return (
    <>
      <Select
        closeMenuOnSelect={false}
        isDisabled={isDisabled}
        id={name}
        filterOption={(candidate, input) => {
          const value = valueRef.current;
          if (!isEmpty(value)) {
            const isSelected =
              value.findIndex(item => item.id === candidate.value.id) !== -1;
            if (isSelected) {
              return false;
            }
          }

          if (input) {
            return createFilter(filterConfig)(candidate, input);
          }

          return true;
        }}
        isLoading={isLoading}
        isMulti
        isSearchable
        onChange={onChange}
        onInputChange={onInputChange}
        onMenuClose={onMenuClose}
        onMenuScrollToBottom={onMenuScrollToBottom}
        placeholder={placeholder}
        options={getOptions()}
        value={[]}
      />

      <ListWrapper ref={drop}>
        {!isEmpty(value) && (
          <ul>
            {value.map((data, index) => (
              <ListItem
                key={data.id}
                data={data}
                findRelation={findRelation}
                mainField={mainField}
                moveRelation={moveRelation}
                nextSearch={nextSearch}
                onRemove={() => onRemove(`${name}.${index}`)}
                targetModel={targetModel}
              />
            ))}
          </ul>
        )}
        {!isEmpty(value) && value.length > 4 && <ListShadow />}
      </ListWrapper>
    </>
  );
}

SelectMany.defaultProps = {
  move: () => { },
  value: null,
};

SelectMany.propTypes = {
  addRelation: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  mainField: PropTypes.string.isRequired,
  move: PropTypes.func,
  name: PropTypes.string.isRequired,
  nextSearch: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.node.isRequired,
  targetModel: PropTypes.string.isRequired,
  value: PropTypes.array,
};

export default memo(SelectMany);
