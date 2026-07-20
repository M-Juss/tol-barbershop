<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasDuplicates = DB::table('closed_dates')
            ->select('date_closed')
            ->groupBy('date_closed')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicates) {
            throw new RuntimeException(
                'Duplicate closed dates must be consolidated before this migration can run.',
            );
        }

        Schema::table('closed_dates', function (Blueprint $table) {
            $table->unique('date_closed', 'closed_dates_date_unique');
        });
    }

    public function down(): void
    {
        Schema::table('closed_dates', function (Blueprint $table) {
            $table->dropUnique('closed_dates_date_unique');
        });
    }
};
