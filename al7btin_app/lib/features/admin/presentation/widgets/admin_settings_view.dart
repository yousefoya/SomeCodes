import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../../../core/config/api_config.dart';
import '../../../../core/widgets/server_config_dialog.dart';
import '../controllers/admin_stats_controller.dart';
import '../controllers/admin_users_controller.dart';
import '../theme/admin_theme.dart';

class AdminSettingsView extends ConsumerStatefulWidget {
  final bool isAr;

  const AdminSettingsView({super.key, required this.isAr});

  @override
  ConsumerState<AdminSettingsView> createState() => _AdminSettingsViewState();
}

class _AdminSettingsViewState extends ConsumerState<AdminSettingsView> {
  bool _isTesting = false;
  int? _latencyMs;
  Map<String, dynamic>? _healthData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _testHealth();
  }

  Future<void> _testHealth() async {
    setState(() {
      _isTesting = true;
      _errorMessage = null;
    });

    final stopwatch = Stopwatch()..start();
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/health');
      final res = await http.get(uri).timeout(const Duration(seconds: 5));
      stopwatch.stop();

      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() {
          _latencyMs = stopwatch.elapsedMilliseconds;
          _healthData = decoded;
          _isTesting = false;
        });
      } else {
        setState(() {
          _latencyMs = stopwatch.elapsedMilliseconds;
          _errorMessage = 'HTTP ${res.statusCode}: ${res.body}';
          _isTesting = false;
        });
      }
    } catch (e) {
      stopwatch.stop();
      setState(() {
        _latencyMs = stopwatch.elapsedMilliseconds;
        _errorMessage = e.toString();
        _isTesting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = widget.isAr;

    final isMobile = MediaQuery.of(context).size.width < 700;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(isMobile ? 14 : 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: AdminTheme.maxContentWidth),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AdminTheme.cardDecoration,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 600;

                    final iconBadge = Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AdminTheme.goldPrimary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.settings_suggest_rounded,
                        color: AdminTheme.goldDark,
                        size: 26,
                      ),
                    );

                    final textColumn = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAr ? 'إعدادات النظام والاتصال بالخادم' : 'System Settings & API Diagnostics',
                          style: TextStyle(
                            fontSize: isNarrow ? 17 : 18,
                            fontWeight: FontWeight.w900,
                            color: AdminTheme.textPrimary,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isAr
                              ? 'تشخيص حالة الخادم السحابي، قاعدة بيانات PostgreSQL وسرعة الاستجابة'
                              : 'Diagnose backend health, REST API latency, and database connections',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AdminTheme.textMuted,
                            fontFamily: 'Cairo',
                          ),
                        ),
                      ],
                    );

                    final configBtn = ElevatedButton.icon(
                      style: AdminTheme.primaryButtonStyle,
                      icon: const Icon(Icons.dns_rounded, size: 18),
                      label: Text(
                        isAr ? 'تغيير عنوان الخادم' : 'Server Config',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo'),
                      ),
                      onPressed: () => _openServerConfig(context, isAr),
                    );

                    if (isNarrow) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              iconBadge,
                              const SizedBox(width: 12),
                              Expanded(child: textColumn),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Align(
                            alignment: isAr ? Alignment.centerRight : Alignment.centerLeft,
                            child: configBtn,
                          ),
                        ],
                      );
                    }

                    return Row(
                      children: [
                        iconBadge,
                        const SizedBox(width: 14),
                        Expanded(child: textColumn),
                        const SizedBox(width: 14),
                        configBtn,
                      ],
                    );
                  },
                ),
              ),

              const SizedBox(height: 20),

              // Server Connectivity Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: AdminTheme.cardDecoration,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isAr ? 'فحص الاتصال بالخادم وقاعدة البيانات' : 'Server Health & Latency',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'Cairo'),
                        ),
                        ElevatedButton.icon(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: const Color(0xFFF1F5F9),
                            foregroundColor: AdminTheme.textPrimary,
                          ),
                          icon: _isTesting
                              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.speed_rounded, size: 18),
                          label: Text(isAr ? 'إعادة الفحص' : 'Ping Test', style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                          onPressed: _isTesting ? null : _testHealth,
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    _buildDiagnosticsGrid(isAr),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // System Operations Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: AdminTheme.cardDecoration,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isAr ? 'عمليات الصيانة والإدارة' : 'System Operations & Cache',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'Cairo'),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        OutlinedButton.icon(
                          icon: const Icon(Icons.refresh_rounded, color: AdminTheme.goldDark),
                          label: Text(
                            isAr ? 'تحديث إحصائيات لوحة التحكم' : 'Refresh Dashboard Stats',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AdminTheme.textPrimary, fontFamily: 'Cairo'),
                          ),
                          onPressed: () {
                            ref.invalidate(adminDashboardStatsProvider);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(isAr ? 'تم تحديث الإحصائيات' : 'Dashboard stats refreshed'),
                                backgroundColor: AdminTheme.success,
                              ),
                            );
                          },
                        ),
                        OutlinedButton.icon(
                          icon: const Icon(Icons.people_outline_rounded, color: AdminTheme.goldDark),
                          label: Text(
                            isAr ? 'إعادة تحميل قائمة المستخدمين' : 'Reload Users Database',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AdminTheme.textPrimary, fontFamily: 'Cairo'),
                          ),
                          onPressed: () {
                            ref.read(adminUsersControllerProvider.notifier).loadUsers(page: 1);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(isAr ? 'تم إعادة تحميل المستخدمين' : 'Users database reloaded'),
                                backgroundColor: AdminTheme.success,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDiagnosticsGrid(bool isAr) {
    final isOnline = _errorMessage == null && _healthData != null;

    final item1 = _diagItem(
      title: isAr ? 'رابط الـ API النشط' : 'Active REST API URL',
      value: ApiConfig.baseUrl,
      icon: Icons.link_rounded,
      color: const Color(0xFF6366F1),
    );

    final item2 = _diagItem(
      title: isAr ? 'زمن الاستجابة (Latency)' : 'Roundtrip Latency',
      value: _latencyMs != null ? '$_latencyMs ms' : '...',
      icon: Icons.timer_outlined,
      color: _latencyMs != null && _latencyMs! < 200 ? AdminTheme.success : AdminTheme.warning,
    );

    final item3 = _diagItem(
      title: isAr ? 'حالة قاعدة البيانات (PostgreSQL)' : 'PostgreSQL Database',
      value: isOnline ? (_healthData?['database']?.toString() ?? 'connected') : (isAr ? 'غير متصل' : 'Disconnected'),
      icon: Icons.storage_rounded,
      color: isOnline ? AdminTheme.success : AdminTheme.error,
    );

    final item4 = _diagItem(
      title: isAr ? 'حالة الخادم' : 'Backend Server Status',
      value: isOnline ? 'HTTP 200 OK (Live)' : (isAr ? 'تعذر الاتصال' : 'Connection Failed'),
      icon: isOnline ? Icons.check_circle_rounded : Icons.cancel_rounded,
      color: isOnline ? AdminTheme.success : AdminTheme.error,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;

        return Column(
          children: [
            if (isNarrow) ...[
              item1,
              const SizedBox(height: 12),
              item2,
              const SizedBox(height: 12),
              item3,
              const SizedBox(height: 12),
              item4,
            ] else ...[
              Row(
                children: [
                  Expanded(child: item1),
                  const SizedBox(width: 16),
                  Expanded(child: item2),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: item3),
                  const SizedBox(width: 16),
                  Expanded(child: item4),
                ],
              ),
            ],
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AdminTheme.errorBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AdminTheme.error.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: AdminTheme.error, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AdminTheme.error, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  Widget _diagItem({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AdminTheme.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 11, color: AdminTheme.textMuted, fontFamily: 'Cairo'),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AdminTheme.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _openServerConfig(BuildContext context, bool isAr) {
    showDialog<void>(
      context: context,
      builder: (ctx) => ServerConfigDialog(isAr: isAr),
    ).then((_) => _testHealth());
  }
}
