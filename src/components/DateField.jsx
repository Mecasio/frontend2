import React from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

dayjs.extend(customParseFormat);

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsedValue = dayjs(value, ["YYYY-MM-DD", "MM/DD/YYYY"], true);
  return parsedValue.isValid() ? parsedValue : null;
};

const DateField = React.forwardRef(function DateField(props, ref) {
  const {
    value,
    onChange,
    name,
    format = "MM/DD/YYYY",
    style,
    sx,
    readOnly,
    disabled,
    InputProps,
    inputProps,
    slotProps,
    minDate,
    maxDate,
    views = ["year", "month", "day"], // <-- select Year -> Month -> Date
    openTo = "year",                  // <-- picker opens on the Year view first
    ...textFieldProps
  } = props;

  const resolvedReadOnly =
    readOnly ?? InputProps?.readOnly ?? inputProps?.readOnly ?? false;
  const resolvedDisabled =
    disabled ?? InputProps?.disabled ?? inputProps?.disabled ?? false;
  const resolvedMinDate = minDate ?? parseDateValue(inputProps?.min);
  const resolvedMaxDate = maxDate ?? parseDateValue(inputProps?.max);

  const mergedInputProps = {
    ...inputProps,
    readOnly: resolvedReadOnly,
  };

  const mergedRootStyles = {
    ...(style?.height ? { minHeight: style.height } : {}),
    ...(style?.borderRadius ? { borderRadius: style.borderRadius } : {}),
  };

  const mergedInputStyles = {
    ...(style?.height ? { height: style.height } : {}),
    ...(style?.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style?.padding ? { padding: style.padding } : {}),
    ...(style?.paddingLeft ? { paddingLeft: style.paddingLeft } : {}),
    ...(style?.paddingRight ? { paddingRight: style.paddingRight } : {}),
  };

  const textFieldSx = {
    ...(style?.width ? { width: style.width } : {}),
    ...(style?.minWidth ? { minWidth: style.minWidth } : {}),
    ...(Object.keys(mergedRootStyles).length
      ? { "& .MuiInputBase-root": mergedRootStyles }
      : {}),
    ...(Object.keys(mergedInputStyles).length
      ? { "& .MuiInputBase-input": mergedInputStyles }
      : {}),
    ...(style?.border
      ? {
          "& .MuiOutlinedInput-notchedOutline": {
            border: style.border,
          },
        }
      : {}),
    ...sx,
    ...slotProps?.textField?.sx,
  };

  return (
    <DatePicker
      format={format}
      value={parseDateValue(value)}
      onChange={(newValue) => {
        const formattedValue =
          newValue && dayjs(newValue).isValid()
            ? dayjs(newValue).format("YYYY-MM-DD")
            : "";

        onChange?.({
          target: {
            name,
            value: formattedValue,
          },
        });
      }}
      disabled={resolvedDisabled}
      readOnly={resolvedReadOnly}
      minDate={resolvedMinDate}
      maxDate={resolvedMaxDate}
      views={views}
      openTo={openTo}
      slotProps={{
        ...slotProps,
        textField: {
          ...textFieldProps,
          ...slotProps?.textField,
          inputRef: ref,
          sx: textFieldSx,
          InputProps: {
            ...InputProps,
            ...slotProps?.textField?.InputProps,
            readOnly: resolvedReadOnly,
          },
          inputProps: {
            ...mergedInputProps,
            ...slotProps?.textField?.inputProps,
          },
        },
      }}
    />
  );
});

export default DateField;