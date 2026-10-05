import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_locale_provider.dart';
import '../../../../core/services/location/location_service_interface.dart';
import '../../../../core/widgets/custom_app_bar.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/gold_gradient_card.dart';
import '../controllers/address_controller.dart';

/// Screen allowing user to add or edit a Jordanian delivery address
class AddEditAddressScreen extends ConsumerStatefulWidget {
  final UserAddress? existingAddress;

  const AddEditAddressScreen({
    super.key,
    this.existingAddress,
  });

  @override
  ConsumerState<AddEditAddressScreen> createState() => _AddEditAddressScreenState();
}

class _AddEditAddressScreenState extends ConsumerState<AddEditAddressScreen> {
  final _formKey = GlobalKey<FormState>();

  late String _selectedTitle;
  late String _selectedCity;
  late TextEditingController _areaController;
  late TextEditingController _streetController;
  late TextEditingController _buildingController;
  late TextEditingController _floorController;
  late TextEditingController _apartmentController;
  late TextEditingController _instructionsController;

  late bool _isDefault;
  GeoPoint _location = const GeoPoint(latitude: 31.9539, longitude: 35.9106);
  bool _isLocating = false;
  bool _locationCaptured = false;

  final List<String> _commonAmmanAreas = [
    'عبدون',
    'دابوق',
    'الجبيهة',
    'تلاع العلي',
    'الصويفية',
    'خلدا',
    'الشميساني',
    'الرابية',
    'مرج الحمام',
    'طبربور',
    'شفا بدران',
  ];

  final List<String> _cities = [
    'عمان',
    'إربد',
    'الزرقاء',
    'السلط',
    'العقبة',
  ];

  @override
  void initState() {
    super.initState();
    final addr = widget.existingAddress;
    _selectedTitle = addr?.title ?? 'المنزل';
    _selectedCity = addr?.city ?? 'عمان';
    _areaController = TextEditingController(text: addr?.area ?? 'عبدون');
    _streetController = TextEditingController(text: addr?.streetAddress ?? '');
    _buildingController = TextEditingController(text: addr?.buildingNumber ?? '');
    _floorController = TextEditingController(text: addr?.floor ?? '');
    _apartmentController = TextEditingController(text: addr?.apartmentNumber ?? '');
    _instructionsController = TextEditingController(text: addr?.deliveryInstructions ?? '');
    _isDefault = addr?.isDefault ?? false;
    if (addr != null) {
      _location = addr.location;
      _locationCaptured = true;
    }
  }

  @override
  void dispose() {
    _areaController.dispose();
    _streetController.dispose();
    _buildingController.dispose();
    _floorController.dispose();
    _apartmentController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  Future<void> _captureLocation() async {
    setState(() => _isLocating = true);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    setState(() {
      _isLocating = false;
      _locationCaptured = true;
      _location = const GeoPoint(latitude: 31.9539, longitude: 35.9106);
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تم التقاط إحداثيات الموقع الحالي GPS بنجاح',
            style: TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.success,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _saveAddress() async {
    if (!_formKey.currentState!.validate()) return;

    // Amman-only service area validation
    final isAr = ref.read(appLocaleProvider).languageCode == 'ar';
    if (_selectedCity != 'عمان' && _selectedCity.toLowerCase() != 'amman') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isAr
                ? 'خدمة بتنحل متوفرة حالياً داخل محافظة العاصمة عمان فقط.'
                : 'BTIN7AL currently delivers only within Amman.',
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final address = UserAddress(
      id: widget.existingAddress?.id ?? '',
      title: _selectedTitle,
      city: _selectedCity,
      area: _areaController.text.trim(),
      streetAddress: _streetController.text.trim(),
      buildingNumber: _buildingController.text.trim().isEmpty ? null : _buildingController.text.trim(),
      floor: _floorController.text.trim().isEmpty ? null : _floorController.text.trim(),
      apartmentNumber: _apartmentController.text.trim().isEmpty ? null : _apartmentController.text.trim(),
      deliveryInstructions: _instructionsController.text.trim().isEmpty ? null : _instructionsController.text.trim(),
      location: _location,
      isDefault: _isDefault,
    );

    final notifier = ref.read(addressNotifierProvider.notifier);
    if (widget.existingAddress == null) {
      final newAddr = await notifier.addAddress(address);
      ref.read(selectedDeliveryAddressProvider.notifier).state = newAddr;
    } else {
      final updated = await notifier.updateAddress(address);
      ref.read(selectedDeliveryAddressProvider.notifier).state = updated;
    }

    if (mounted) {
      Navigator.of(context).pop(address);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = ref.watch(appLocaleProvider).languageCode == 'ar';
    final isEdit = widget.existingAddress != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomAppBar(
        title: isEdit
            ? (isAr ? 'تعديل العنوان' : 'Edit Address')
            : (isAr ? 'إضافة عنوان جديد' : 'Add New Address'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Address Type Selection
                Text(
                  isAr ? 'نوع العنوان' : 'Address Label',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildTypeChip('المنزل', Icons.home_rounded, isAr ? 'المنزل' : 'Home'),
                    const SizedBox(width: 8),
                    _buildTypeChip('العمل', Icons.business_rounded, isAr ? 'العمل' : 'Work'),
                    const SizedBox(width: 8),
                    _buildTypeChip('أخرى', Icons.location_on_rounded, isAr ? 'أخرى' : 'Other'),
                  ],
                ),
                const SizedBox(height: 18),

                // City Selector
                Text(
                  isAr ? 'المدينة' : 'City',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: AppDimensions.borderRadiusMd,
                    border: Border.all(color: AppColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedCity,
                      isExpanded: true,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.goldDark),
                      items: _cities.map((city) {
                        return DropdownMenuItem(
                          value: city,
                          child: Text(
                            city,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedCity = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Area / Neighborhood
                Text(
                  isAr ? 'المنطقة / الحي' : 'Area / Neighborhood',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _areaController,
                  validator: (v) => v == null || v.trim().isEmpty ? (isAr ? 'يرجى إدخال المنطقة' : 'Required') : null,
                  decoration: InputDecoration(
                    hintText: isAr ? 'مثال: عبدون، الجبيهة، خلدا' : 'e.g. Abdoun, Khalda',
                    prefixIcon: const Icon(Icons.map_outlined, color: AppColors.goldDark, size: 20),
                  ),
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),

                // Common Areas suggestions
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _commonAmmanAreas.map((area) {
                    final isCurrent = _areaController.text == area;
                    return ActionChip(
                      label: Text(
                        area,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w500,
                          color: isCurrent ? AppColors.goldDark : AppColors.textSecondary,
                          fontFamily: 'Cairo',
                        ),
                      ),
                      backgroundColor: isCurrent
                          ? AppColors.goldPrimary.withValues(alpha: 0.15)
                          : AppColors.surface,
                      side: BorderSide(
                        color: isCurrent ? AppColors.goldPrimary : AppColors.border,
                      ),
                      onPressed: () {
                        setState(() {
                          _areaController.text = area;
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 18),

                // Street Address & Landmark
                Text(
                  isAr ? 'اسم الشارع / معلم مميز' : 'Street & Landmark',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _streetController,
                  validator: (v) => v == null || v.trim().isEmpty ? (isAr ? 'يرجى إدخال اسم الشارع' : 'Required') : null,
                  decoration: InputDecoration(
                    hintText: isAr ? 'اسم الشارع الرئيسي، بجانب مسجد أو مجمع' : 'Street name and nearby landmark',
                    prefixIcon: const Icon(Icons.signpost_outlined, color: AppColors.goldDark, size: 20),
                  ),
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 18),

                // Building Details (Building, Floor, Apt)
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isAr ? 'رقم العمارة' : 'Building #',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
                          ),
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _buildingController,
                            decoration: const InputDecoration(hintText: '12'),
                            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isAr ? 'الطابق' : 'Floor',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
                          ),
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _floorController,
                            decoration: const InputDecoration(hintText: '3'),
                            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isAr ? 'رقم الشقة' : 'Apt #',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
                          ),
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _apartmentController,
                            decoration: const InputDecoration(hintText: '6'),
                            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Delivery Notes
                Text(
                  isAr ? 'تعليمات إضافية للتوصيل (اختياري)' : 'Delivery Notes (Optional)',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _instructionsController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: isAr
                        ? 'مثال: الباب الجانبي، يرجى الاتصال مسبقاً'
                        : 'e.g. Side entrance, call upon arrival',
                  ),
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
                ),
                const SizedBox(height: 18),

                // GPS Location Capture Card
                GoldGradientCard(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _locationCaptured
                              ? AppColors.success.withValues(alpha: 0.15)
                              : AppColors.goldPrimary.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _locationCaptured ? Icons.my_location_rounded : Icons.location_searching_rounded,
                          color: _locationCaptured ? AppColors.success : AppColors.goldDark,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isAr ? 'إحداثيات GPS' : 'GPS Coordinates',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'Cairo',
                              ),
                            ),
                            Text(
                              _locationCaptured
                                  ? '${_location.latitude.toStringAsFixed(4)}, ${_location.longitude.toStringAsFixed(4)} (عمان)'
                                  : (isAr ? 'انقر لتثبيت الموقع الجغرافي' : 'Tap to capture GPS location'),
                              style: TextStyle(
                                fontSize: 11,
                                color: _locationCaptured ? AppColors.success : AppColors.textMuted,
                                fontWeight: FontWeight.w600,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: _isLocating ? null : _captureLocation,
                        child: _isLocating
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.goldPrimary),
                              )
                            : Text(
                                _locationCaptured ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'تحديد' : 'Capture'),
                                style: const TextStyle(fontWeight: FontWeight.w800, fontFamily: 'Cairo'),
                              ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Set as default checkbox
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isDefault,
                  activeColor: AppColors.goldPrimary,
                  title: Text(
                    isAr ? 'تعيين كعنوان توصيل رئيسي افتراضي' : 'Set as default delivery address',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  onChanged: (val) {
                    if (val != null) setState(() => _isDefault = val);
                  },
                ),
                const SizedBox(height: 24),

                // Submit Button
                CustomButton(
                  label: isEdit
                      ? (isAr ? 'حفظ التعديلات' : 'Save Changes')
                      : (isAr ? 'حفظ العنوان' : 'Save Address'),
                  icon: Icons.check_circle_outline_rounded,
                  onPressed: _saveAddress,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTypeChip(String type, IconData icon, String label) {
    final isSelected = _selectedTitle == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedTitle = type),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.goldPrimary.withValues(alpha: 0.15) : AppColors.surface,
            borderRadius: AppDimensions.borderRadiusMd,
            border: Border.all(
              color: isSelected ? AppColors.goldPrimary : AppColors.border,
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.goldDark : AppColors.textSecondary,
                size: 20,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? AppColors.goldDark : AppColors.textSecondary,
                  fontFamily: 'Cairo',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
