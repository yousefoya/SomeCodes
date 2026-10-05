import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../constants/app_colors.dart';

/// Interactive Server Configuration & Connectivity Diagnostic Dialog
class ServerConfigDialog extends StatefulWidget {
  final bool isAr;
  final VoidCallback? onSaved;

  const ServerConfigDialog({
    super.key,
    required this.isAr,
    this.onSaved,
  });

  static Future<void> show(BuildContext context, {required bool isAr, VoidCallback? onSaved}) {
    return showDialog<void>(
      context: context,
      builder: (ctx) => ServerConfigDialog(isAr: isAr, onSaved: onSaved),
    );
  }

  @override
  State<ServerConfigDialog> createState() => _ServerConfigDialogState();
}

class _ServerConfigDialogState extends State<ServerConfigDialog> {
  late final TextEditingController _urlController;
  HealthCheckResult? _healthResult;
  bool _isChecking = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: ApiConfig.baseUrl);
    _runHealthCheck();
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _runHealthCheck() async {
    setState(() {
      _isChecking = true;
      _healthResult = null;
    });

    final targetUrl = _urlController.text.trim();
    final result = await ApiConfig.checkHealth(targetUrl: targetUrl);

    if (mounted) {
      setState(() {
        _isChecking = false;
        _healthResult = result;
      });
    }
  }

  void _applyPreset(String presetUrl) {
    setState(() {
      _urlController.text = presetUrl;
    });
    _runHealthCheck();
  }

  @override
  Widget build(BuildContext context) {
    final isAr = widget.isAr;

    return AlertDialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          const Icon(Icons.dns_rounded, color: AppColors.goldDark, size: 22),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              isAr ? 'إعدادات اتصال الخادم (API Host)' : 'Server Connection & Diagnostics',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                fontFamily: 'Cairo',
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active Runtime Server Indicator
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.goldPrimary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.goldPrimary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 14, color: AppColors.goldDark),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${isAr ? "العنوان النشط حالياً في التطبيق" : "Active Runtime API"}:\n${ApiConfig.baseUrl}',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'monospace', color: AppColors.textPrimary),
                    ),
                  ),
                ],
              ),
            ),

            Text(
              isAr
                  ? 'اختر وضع الاتصال المناسب لجهازك أو أدخل عنوان الخادم يدوياً:'
                  : 'Select connection mode or enter your server URL manually:',
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'Cairo'),
            ),
            const SizedBox(height: 12),

            // Connection Mode Quick Presets
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _buildPresetChip(
                  label: isAr ? '📱 شبكة Wi-Fi للكمبيوتر (192.168.1.10)' : '📱 PC Wi-Fi (192.168.1.10)',
                  url: ApiConfig.lanIpBaseUrl,
                ),
                _buildPresetChip(
                  label: isAr ? '🔌 وصلة USB / ADB Reverse (localhost)' : '🔌 USB / ADB Reverse (localhost)',
                  url: ApiConfig.adbReverseBaseUrl,
                ),
                _buildPresetChip(
                  label: isAr ? '💻 محاكي أندرويد (10.0.2.2)' : '💻 Android Emulator (10.0.2.2)',
                  url: ApiConfig.emulatorBaseUrl,
                ),
              ],
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _urlController,
              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontFamily: 'monospace'),
              decoration: InputDecoration(
                labelText: isAr ? 'عنوان الخادم الأساسي (Base URL)*' : 'API Base URL*',
                hintText: 'http://192.168.1.10:5000/api/v1',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: AppColors.goldDark, size: 20),
                  tooltip: isAr ? 'فحص الاتصال' : 'Check Connectivity',
                  onPressed: _isChecking ? null : _runHealthCheck,
                ),
              ),
              onChanged: (_) {
                if (_healthResult != null) setState(() => _healthResult = null);
              },
            ),
            const SizedBox(height: 12),

            // Live Connectivity Test Status Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _isChecking
                    ? AppColors.backgroundSecondary
                    : (_healthResult?.isHealthy ?? false)
                        ? AppColors.success.withValues(alpha: 0.1)
                        : (_healthResult != null)
                            ? AppColors.error.withValues(alpha: 0.1)
                            : AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _isChecking
                      ? AppColors.border
                      : (_healthResult?.isHealthy ?? false)
                          ? AppColors.success
                          : (_healthResult != null)
                              ? AppColors.error
                              : AppColors.border,
                ),
              ),
              child: _isChecking
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.goldPrimary)),
                        const SizedBox(width: 8),
                        Text(isAr ? 'جاري فحص الاتصال بالخادم...' : 'Testing connection...', style: const TextStyle(fontSize: 11, fontFamily: 'Cairo')),
                      ],
                    )
                  : _healthResult != null
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  _healthResult!.isHealthy ? Icons.check_circle_rounded : Icons.error_rounded,
                                  color: _healthResult!.isHealthy ? AppColors.success : AppColors.error,
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _healthResult!.isHealthy
                                        ? (isAr ? '✅ الخادم متصل بنجاح (${_healthResult!.latencyMs}ms)' : '✅ Connected successfully (${_healthResult!.latencyMs}ms)')
                                        : (isAr ? '❌ تعذر الوصول للخادم (HTTP ${_healthResult!.statusCode})' : '❌ Failed to reach server'),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'Cairo',
                                      color: _healthResult!.isHealthy ? AppColors.success : AppColors.error,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (_healthResult!.isHealthy) ...[
                              const SizedBox(height: 2),
                              Text(
                                '${isAr ? "قاعدة البيانات" : "DB"}: ${_healthResult!.databaseStatus ?? "connected"} • ${_healthResult!.serverService ?? "btin7al-api"}',
                                style: const TextStyle(fontSize: 10, color: AppColors.textSecondary, fontFamily: 'Cairo'),
                              ),
                            ] else if (_healthResult!.errorMessage != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                _healthResult!.errorMessage!,
                                style: const TextStyle(fontSize: 9, color: AppColors.error, fontFamily: 'monospace'),
                              ),
                            ],
                          ],
                        )
                      : Text(
                          isAr ? 'اضغط على زر الفحص للتحقق من الاتصال' : 'Click refresh to test connectivity',
                          style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontFamily: 'Cairo'),
                        ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () async {
            await ApiConfig.resetToDefaultDevServer();
            setState(() {
              _urlController.text = ApiConfig.baseUrl;
            });
            _runHealthCheck();
            if (context.mounted) {
              widget.onSaved?.call();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    isAr ? 'تم إعادة التعيين لخادم التطوير: ${ApiConfig.baseUrl}' : 'Reset to development server: ${ApiConfig.baseUrl}',
                    style: const TextStyle(fontFamily: 'Cairo'),
                  ),
                  backgroundColor: AppColors.success,
                ),
              );
            }
          },
          child: Text(
            isAr ? 'إعادة ضبط لخادم التطوير' : 'Reset to Dev Server',
            style: const TextStyle(fontFamily: 'Cairo', color: AppColors.goldDark, fontWeight: FontWeight.w700),
          ),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(fontFamily: 'Cairo')),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.goldPrimary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: () async {
            final url = _urlController.text.trim();
            if (url.isNotEmpty) {
              await ApiConfig.setCustomBaseUrl(url);
            } else {
              await ApiConfig.resetToDefaultDevServer();
            }
            if (context.mounted) {
              Navigator.pop(context);
              widget.onSaved?.call();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    isAr ? 'تم تحديث عنوان الخادم إلى: ${ApiConfig.baseUrl}' : 'Server URL updated to: ${ApiConfig.baseUrl}',
                    style: const TextStyle(fontFamily: 'Cairo'),
                  ),
                  backgroundColor: AppColors.success,
                ),
              );
            }
          },
          child: Text(isAr ? 'حفظ وتطبيق' : 'Save & Apply', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontFamily: 'Cairo')),
        ),
      ],
    );
  }

  Widget _buildPresetChip({required String label, required String url}) {
    final isSelected = _urlController.text.trim() == url;

    return ActionChip(
      label: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'Cairo', color: isSelected ? Colors.white : AppColors.textPrimary)),
      backgroundColor: isSelected ? AppColors.goldPrimary : AppColors.backgroundSecondary,
      side: BorderSide(color: isSelected ? AppColors.goldPrimary : AppColors.border),
      onPressed: () => _applyPreset(url),
    );
  }
}
