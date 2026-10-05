import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../domain/entities/dynamic_service_config_entity.dart';

/// Dynamic Form Field Widget Builder mapping 15 field types to Flutter UI
class DynamicFormFieldWidget extends StatelessWidget {
  final ServiceFieldEntity field;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  final bool isAr;
  final String? errorText;

  const DynamicFormFieldWidget({
    super.key,
    required this.field,
    required this.value,
    required this.onChanged,
    required this.isAr,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    final label = isAr ? field.labelAr : field.labelEn;
    final hint = isAr ? field.placeholderAr : field.placeholderEn;
    final unit = isAr ? field.unitAr : field.unitEn;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Field Label
          Row(
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              if (field.isRequired)
                const Text(
                  ' *',
                  style: TextStyle(
                    color: AppColors.error,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              if (unit != null && unit.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: Text(
                    '($unit)',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary.withValues(alpha: 0.8),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),

          // Render field control based on type
          _buildFieldControl(context, hint),

          // Error text
          if (errorText != null)
            Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text(
                errorText!,
                style: const TextStyle(fontSize: 12, color: AppColors.error),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFieldControl(BuildContext context, String? hint) {
    switch (field.fieldType) {
      case DynamicFieldType.text:
      case DynamicFieldType.textarea:
        return TextFormField(
          initialValue: value?.toString() ?? '',
          maxLines: field.fieldType == DynamicFieldType.textarea ? 3 : 1,
          decoration: InputDecoration(
            hintText: hint ?? (isAr ? 'أدخل القيمة...' : 'Enter value...'),
            hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
          onChanged: onChanged,
        );

      case DynamicFieldType.number:
        return TextFormField(
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: hint ?? '0',
            hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
          onChanged: (val) {
            final parsed = double.tryParse(val);
            onChanged(parsed ?? 0);
          },
        );

      case DynamicFieldType.counter:
        final currentCount = (value is num) ? (value as num).toInt() : (field.min?.toInt() ?? 1);
        final minVal = field.min?.toInt() ?? 1;
        final maxVal = field.max?.toInt() ?? 100;
        final stepVal = field.step?.toInt() ?? 1;

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline, color: AppColors.primary),
                onPressed: currentCount > minVal
                    ? () => onChanged(currentCount - stepVal)
                    : null,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  '$currentCount',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                onPressed: currentCount < maxVal
                    ? () => onChanged(currentCount + stepVal)
                    : null,
              ),
            ],
          ),
        );

      case DynamicFieldType.slider:
        final currentSlider = (value is num)
            ? (value as num).toDouble()
            : (field.min ?? 0.0);
        final minSlider = field.min ?? 0.0;
        final maxSlider = field.max ?? 100.0;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${minSlider.toInt()}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${currentSlider.toInt()} ${field.unitAr ?? ''}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                Text(
                  '${maxSlider.toInt()}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
            Slider(
              value: currentSlider.clamp(minSlider, maxSlider),
              min: minSlider,
              max: maxSlider,
              divisions: (maxSlider - minSlider).toInt() > 0 ? (maxSlider - minSlider).toInt() : 1,
              activeColor: AppColors.primary,
              inactiveColor: AppColors.border,
              onChanged: (newVal) => onChanged(newVal.round()),
            ),
          ],
        );

      case DynamicFieldType.toggle:
        final isChecked = (value is bool) ? value as bool : false;
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: SwitchListTile(
            title: Text(
              isChecked ? (isAr ? 'نعم / متوفر' : 'Yes / Available') : (isAr ? 'لا / غير متوفر' : 'No / Unavailable'),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            value: isChecked,
            activeColor: AppColors.primary,
            onChanged: onChanged,
          ),
        );

      case DynamicFieldType.checkbox:
        final isChecked = (value is bool) ? value as bool : false;
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: CheckboxListTile(
            title: Text(
              isAr ? field.labelAr : field.labelEn,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            value: isChecked,
            activeColor: AppColors.primary,
            onChanged: onChanged,
          ),
        );

      case DynamicFieldType.select:
        return DropdownButtonFormField<dynamic>(
          value: value ?? (field.options.isNotEmpty ? field.options.first.value : null),
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
          ),
          items: field.options.map((opt) {
            final optLabel = isAr ? opt.labelAr : opt.labelEn;
            final priceExtra = opt.priceModifier > 0
                ? ' (+${opt.priceModifier.toStringAsFixed(2)} JOD)'
                : '';
            return DropdownMenuItem<dynamic>(
              value: opt.value,
              child: Text(
                '$optLabel$priceExtra',
                style: const TextStyle(fontSize: 14),
              ),
            );
          }).toList(),
          onChanged: onChanged,
        );

      case DynamicFieldType.radio:
        return Column(
          children: field.options.map((opt) {
            final isSelected = value == opt.value;
            final optLabel = isAr ? opt.labelAr : opt.labelEn;
            final priceExtra = opt.priceModifier > 0
                ? ' (+${opt.priceModifier.toStringAsFixed(2)} JOD)'
                : '';

            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary.withValues(alpha: 0.05) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.border,
                  width: isSelected ? 1.5 : 1.0,
                ),
              ),
              child: RadioListTile<dynamic>(
                title: Text(
                  '$optLabel$priceExtra',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.primary : AppColors.textPrimary,
                  ),
                ),
                value: opt.value,
                groupValue: value,
                activeColor: AppColors.primary,
                onChanged: onChanged,
              ),
            );
          }).toList(),
        );

      case DynamicFieldType.multiSelect:
        final selectedList = (value is List) ? List<dynamic>.from(value as List) : <dynamic>[];

        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: field.options.map((opt) {
            final isSelected = selectedList.contains(opt.value);
            final optLabel = isAr ? opt.labelAr : opt.labelEn;

            return FilterChip(
              label: Text(optLabel),
              selected: isSelected,
              selectedColor: AppColors.primary.withValues(alpha: 0.15),
              checkmarkColor: AppColors.primary,
              labelStyle: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? AppColors.primary : AppColors.textPrimary,
              ),
              onSelected: (bool selected) {
                final updated = List<dynamic>.from(selectedList);
                if (selected) {
                  updated.add(opt.value);
                } else {
                  updated.remove(opt.value);
                }
                onChanged(updated);
              },
            );
          }).toList(),
        );

      case DynamicFieldType.date:
        final dateStr = value?.toString() ?? '';

        return InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: DateTime.now().add(const Duration(days: 1)),
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 90)),
            );
            if (picked != null) {
              onChanged('${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  dateStr.isNotEmpty ? dateStr : (isAr ? 'اختر التاريخ...' : 'Select Date...'),
                  style: TextStyle(
                    fontSize: 14,
                    color: dateStr.isNotEmpty ? AppColors.textPrimary : AppColors.textMuted,
                  ),
                ),
                const Icon(Icons.calendar_today, size: 18, color: AppColors.primary),
              ],
            ),
          ),
        );

      case DynamicFieldType.time:
        final timeStr = value?.toString() ?? '';

        return InkWell(
          onTap: () async {
            final picked = await showTimePicker(
              context: context,
              initialTime: const TimeOfDay(hour: 10, minute: 0),
            );
            if (picked != null) {
              onChanged('${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}');
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  timeStr.isNotEmpty ? timeStr : (isAr ? 'اختر الوقت...' : 'Select Time...'),
                  style: TextStyle(
                    fontSize: 14,
                    color: timeStr.isNotEmpty ? AppColors.textPrimary : AppColors.textMuted,
                  ),
                ),
                const Icon(Icons.access_time, size: 18, color: AppColors.primary),
              ],
            ),
          ),
        );

      case DynamicFieldType.datetime:
        final dtStr = value?.toString() ?? '';

        return InkWell(
          onTap: () async {
            final pickedDate = await showDatePicker(
              context: context,
              initialDate: DateTime.now().add(const Duration(days: 1)),
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 90)),
            );
            if (pickedDate != null && context.mounted) {
              final pickedTime = await showTimePicker(
                context: context,
                initialTime: const TimeOfDay(hour: 10, minute: 0),
              );
              if (pickedTime != null) {
                onChanged(
                  '${pickedDate.year}-${pickedDate.month.toString().padLeft(2, '0')}-${pickedDate.day.toString().padLeft(2, '0')} ${pickedTime.hour.toString().padLeft(2, '0')}:${pickedTime.minute.toString().padLeft(2, '0')}',
                );
              }
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  dtStr.isNotEmpty ? dtStr : (isAr ? 'اختر الموعد والوقت...' : 'Select Date & Time...'),
                  style: TextStyle(
                    fontSize: 14,
                    color: dtStr.isNotEmpty ? AppColors.textPrimary : AppColors.textMuted,
                  ),
                ),
                const Icon(Icons.event, size: 18, color: AppColors.primary),
              ],
            ),
          ),
        );

      case DynamicFieldType.imageUpload:
        final photosCount = (value is List) ? (value as List).length : (value != null ? 1 : 0);

        return InkWell(
          onTap: () {
            // Simulated image pick / upload
            onChanged(['simulated_photo_1.jpg', 'simulated_photo_2.jpg']);
          },
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border, style: BorderStyle.solid),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.add_photo_alternate_outlined, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  photosCount > 0
                      ? (isAr ? 'تم تحديد $photosCount صور' : '$photosCount photos attached')
                      : (isAr ? 'انقر لرفع صور أو ملفات' : 'Tap to upload photos'),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary),
                ),
              ],
            ),
          ),
        );

      case DynamicFieldType.location:
        final locStr = value?.toString() ?? '';

        return InkWell(
          onTap: () {
            onChanged(isAr ? 'عمان - الجبيهة شارع الجامعة' : 'Amman - Jubaiha');
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 18, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Text(
                      locStr.isNotEmpty ? locStr : (isAr ? 'تحديد الموقع على الخريطة...' : 'Select location on map...'),
                      style: TextStyle(
                        fontSize: 14,
                        color: locStr.isNotEmpty ? AppColors.textPrimary : AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
              ],
            ),
          ),
        );
    }
  }
}
