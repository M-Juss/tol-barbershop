<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('closed_dates', function (Blueprint $table) {
            $table->dropUnique('closed_dates_date_unique');
            $table->string('closure_scope', 20)->default('shop')->after('date_closed');
            $table->foreignId('barber_user_id')
                ->nullable()
                ->after('closure_scope')
                ->constrained('users')
                ->restrictOnDelete();
            $table->string('barber_name_snapshot')->nullable()->after('barber_user_id');
            $table->string('scope_key', 64)->default('shop')->after('barber_name_snapshot');
            $table->foreignId('created_by_user_id')
                ->nullable()
                ->after('is_removed')
                ->constrained('users')
                ->nullOnDelete();
            $table->unique(['date_closed', 'scope_key'], 'closed_dates_date_scope_unique');
            $table->index(['is_removed', 'closure_scope', 'date_closed'], 'closed_dates_active_scope_date_index');
        });

        Schema::create('closed_date_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('closed_date_id')->constrained('closed_dates')->restrictOnDelete();
            $table->string('action', 20);
            $table->string('closure_scope', 20);
            $table->date('date_closed');
            $table->unsignedBigInteger('barber_user_id')->nullable();
            $table->string('barber_name_snapshot')->nullable();
            $table->string('reason');
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name_snapshot')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'id']);
            $table->index(['date_closed', 'closure_scope']);
        });

        DB::table('closed_dates')
            ->orderBy('id')
            ->chunkById(500, function ($closedDates): void {
                $activities = [];

                foreach ($closedDates as $closedDate) {
                    $activities[] = [
                        'closed_date_id' => $closedDate->id,
                        'action' => 'closed',
                        'closure_scope' => 'shop',
                        'date_closed' => $closedDate->date_closed,
                        'barber_user_id' => null,
                        'barber_name_snapshot' => null,
                        'reason' => $closedDate->reason,
                        'actor_user_id' => null,
                        'actor_name_snapshot' => null,
                        'created_at' => $closedDate->created_at,
                        'updated_at' => $closedDate->created_at,
                    ];

                    if ($closedDate->is_removed) {
                        $activities[] = [
                            'closed_date_id' => $closedDate->id,
                            'action' => 'reopened',
                            'closure_scope' => 'shop',
                            'date_closed' => $closedDate->date_closed,
                            'barber_user_id' => null,
                            'barber_name_snapshot' => null,
                            'reason' => $closedDate->reason,
                            'actor_user_id' => null,
                            'actor_name_snapshot' => null,
                            'created_at' => $closedDate->updated_at,
                            'updated_at' => $closedDate->updated_at,
                        ];
                    }
                }

                if ($activities !== []) {
                    DB::table('closed_date_activities')->insert($activities);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('closed_date_activities');

        Schema::table('closed_dates', function (Blueprint $table) {
            $table->dropIndex('closed_dates_active_scope_date_index');
            $table->dropUnique('closed_dates_date_scope_unique');
            $table->dropConstrainedForeignId('created_by_user_id');
            $table->dropConstrainedForeignId('barber_user_id');
            $table->dropColumn([
                'closure_scope',
                'barber_name_snapshot',
                'scope_key',
            ]);
            $table->unique('date_closed', 'closed_dates_date_unique');
        });
    }
};
