import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../data/repositories/api_admin_repository.dart';
import '../controllers/admin_users_controller.dart';
import '../theme/admin_theme.dart';

class AdminUserEditDialog extends StatefulWidget {
  final UserEntity user;
  final bool isAr;
  final AdminUsersController controller;

  const AdminUserEditDialog({
    super.key,
    required this.user,
    required this.isAr,
    required this.controller,
  });

  static Future<void> show(
    BuildContext context, {
    required UserEntity user,
    required bool isAr,
    required AdminUsersController controller,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AdminUserEditDialog(
        user: user,
        isAr: isAr,
        controller: controller,
      ),
    );
  }

  @override
  State<AdminUserEditDialog> createState() => _AdminUserEditDialogState();
}

class _AdminUserEditDialogState extends State<AdminUserEditDialog> {
  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  late String _selectedRole;
  late bool _isSuspended;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.user.name ?? '');
    _emailCtrl = TextEditingController(text: widget.user.email ?? '');
    _selectedRole = widget.user.role.toBackendString();
    _isSuspended = widget.user.isSuspended;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AdminTheme.goldLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.manage_accounts_rounded, color: AdminTheme.goldDark, size: 20),
          ),
          const SizedBox(width: 10),
          Text(
            widget.isAr ? 'تعديل بيانات المستخدم' : 'Edit User Account',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16),
          ),
        ],
      ),
      content: Container(
        width: double.maxFinite,
        constraints: const BoxConstraints(maxWidth: 440),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.phone_iphone_rounded, size: 18, color: AdminTheme.textSecondary),
                    const SizedBox(width: 8),
                    Text(
                      '📱 ${widget.isAr ? "رقم الهاتف" : "Phone"}: ${widget.user.phoneNumber}',
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 13, color: AdminTheme.textPrimary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  labelText: widget.isAr ? 'الاسم الكامل' : 'Full Name',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailCtrl,
                decoration: InputDecoration(
                  labelText: widget.isAr ? 'البريد الإلكتروني' : 'Email Address',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                widget.isAr ? 'دور وصلاحية المستخدم في النظام:*' : 'System Role:*',
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 12, color: AdminTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedRole,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: [
                  DropdownMenuItem(value: 'customer', child: Text(widget.isAr ? 'عميل (Customer)' : 'Customer')),
                  DropdownMenuItem(value: 'admin', child: Text(widget.isAr ? 'مسؤول النظام (Admin)' : 'Admin')),
                  DropdownMenuItem(value: 'provider', child: Text(widget.isAr ? 'مزود خدمة / متجر (Provider)' : 'Provider')),
                  DropdownMenuItem(value: 'delivery', child: Text(widget.isAr ? 'مندوب توصيل (Delivery)' : 'Delivery Partner')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedRole = val);
                },
              ),
              const SizedBox(height: 14),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(widget.isAr ? 'إيقاف الحساب (Suspend)' : 'Suspend Account', style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w700)),
                subtitle: Text(
                  widget.isAr ? 'سيتم تعطيل تسجيل الدخول وسحب الجلسات النشطة فورياً' : 'Will immediately revoke active JWT sessions',
                  style: const TextStyle(fontSize: 11, color: AdminTheme.textMuted, fontFamily: 'Cairo'),
                ),
                value: _isSuspended,
                activeThumbColor: AdminTheme.error,
                onChanged: (val) => setState(() => _isSuspended = val),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: Text(widget.isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo')),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AdminTheme.goldPrimary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
          onPressed: _isSubmitting ? null : _saveUser,
          child: _isSubmitting
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(widget.isAr ? 'حفظ التغييرات' : 'Save Changes', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800)),
        ),
      ],
    );
  }

  Future<void> _saveUser() async {
    setState(() => _isSubmitting = true);
    try {
      await widget.controller.updateUser(
        id: widget.user.id,
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        role: _selectedRole,
        isSuspended: _isSuspended,
      );

      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.isAr ? '✅ تم تحديث بيانات المستخدم في PostgreSQL بنجاح' : 'User updated successfully'),
          backgroundColor: AdminTheme.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('فشل التحديث: $e'), backgroundColor: AdminTheme.error),
      );
    }
  }
}

class AdminUserAddDialog extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminUserAddDialog({super.key, required this.isAr});

  static Future<void> show(BuildContext context, {required bool isAr}) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AdminUserAddDialog(isAr: isAr),
    );
  }

  @override
  ConsumerState<AdminUserAddDialog> createState() => _AdminUserAddDialogState();
}

class _AdminUserAddDialogState extends ConsumerState<AdminUserAddDialog> {
  final _phoneCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  String _selectedRole = 'customer';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AdminTheme.goldLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.person_add_rounded, color: AdminTheme.goldDark, size: 20),
          ),
          const SizedBox(width: 10),
          Text(
            widget.isAr ? 'إضافة مستخدم جديد' : 'Register New User',
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16),
          ),
        ],
      ),
      content: Container(
        width: double.maxFinite,
        constraints: const BoxConstraints(maxWidth: 440),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: widget.isAr ? 'رقم الهاتف (079XXXXXXX)*' : 'Phone Number*',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  labelText: widget.isAr ? 'الاسم الكامل' : 'Full Name',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: widget.isAr ? 'البريد الإلكتروني' : 'Email Address',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                widget.isAr ? 'دور وصلاحية المستخدم في النظام:*' : 'System Role:*',
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 12, color: AdminTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedRole,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: [
                  DropdownMenuItem(value: 'customer', child: Text(widget.isAr ? 'عميل (Customer)' : 'Customer')),
                  DropdownMenuItem(value: 'admin', child: Text(widget.isAr ? 'مسؤول النظام (Admin)' : 'Admin')),
                  DropdownMenuItem(value: 'provider', child: Text(widget.isAr ? 'مزود خدمة / متجر (Provider)' : 'Provider')),
                  DropdownMenuItem(value: 'delivery', child: Text(widget.isAr ? 'مندوب توصيل (Delivery)' : 'Delivery Partner')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedRole = val);
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: Text(widget.isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo')),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AdminTheme.goldPrimary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
          onPressed: _isSubmitting ? null : _createUser,
          child: _isSubmitting
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(widget.isAr ? 'إنشاء الحساب' : 'Create User', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800)),
        ),
      ],
    );
  }

  Future<void> _createUser() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.isAr ? 'يرجى إدخال رقم الهاتف' : 'Please enter phone number'),
          backgroundColor: AdminTheme.error,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final repo = ref.read(adminRepositoryProvider);
      await repo.createUser(
        phoneNumber: phone,
        name: _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
        role: _selectedRole,
      );

      // Reload users list
      await ref.read(adminUsersControllerProvider.notifier).loadUsers();

      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.isAr ? '✅ تم إنشاء الحساب وحفظه في PostgreSQL' : 'User account created successfully'),
          backgroundColor: AdminTheme.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('فشل إنشاء المستخدم: $e'), backgroundColor: AdminTheme.error),
      );
    }
  }
}
