<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndexIfMissing('appointments', ['created_at', 'id'], 'appointments_created_id_list_index');
        $this->addIndexIfMissing('appointments', ['user_id', 'created_at', 'id'], 'appointments_user_created_id_list_index');
        $this->addIndexIfMissing('appointments', ['status', 'created_at', 'id'], 'appointments_status_created_id_list_index');
        $this->addIndexIfMissing('appointments', ['is_walkin', 'created_at', 'id'], 'appointments_walkin_created_id_list_index');
        $this->addIndexIfMissing('users', ['role', 'fullname', 'id'], 'users_role_fullname_id_list_index');
        $this->addIndexIfMissing('appointments', ['user_id', 'status', 'appointment_date'], 'appointments_user_status_date_list_index');
        $this->addIndexIfMissing('appointment_feedback', ['created_at', 'id'], 'appointment_feedback_created_id_list_index');
        $this->addIndexIfMissing('appointment_feedback', ['rating', 'created_at', 'id'], 'appointment_feedback_rating_created_id_list_index');
        $this->addIndexIfMissing('appointment_feedback', ['is_featured', 'created_at', 'id'], 'appointment_feedback_featured_created_id_list_index');
    }

    public function down(): void
    {
        $this->dropIndexIfExists('appointment_feedback', 'appointment_feedback_featured_created_id_list_index');
        $this->dropIndexIfExists('appointment_feedback', 'appointment_feedback_rating_created_id_list_index');
        $this->dropIndexIfExists('appointment_feedback', 'appointment_feedback_created_id_list_index');
        $this->dropIndexIfExists('appointments', 'appointments_user_status_date_list_index');
        $this->dropIndexIfExists('users', 'users_role_fullname_id_list_index');
        $this->dropIndexIfExists('appointments', 'appointments_walkin_created_id_list_index');
        $this->dropIndexIfExists('appointments', 'appointments_status_created_id_list_index');
        $this->dropIndexIfExists('appointments', 'appointments_user_created_id_list_index');
        $this->dropIndexIfExists('appointments', 'appointments_created_id_list_index');
    }

    private function addIndexIfMissing(string $table, array $columns, string $name): void
    {
        if (! Schema::hasTable($table) || $this->hasIndex($table, $name) || $this->hasEquivalentIndex($table, $columns)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
            $blueprint->index($columns, $name);
        });
    }

    private function dropIndexIfExists(string $table, string $name): void
    {
        if (! Schema::hasTable($table) || ! $this->hasIndex($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($name) {
            $blueprint->dropIndex($name);
        });
    }

    private function hasIndex(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $index) => $index['name'] === $name);
    }

    private function hasEquivalentIndex(string $table, array $columns): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $index) => array_values($index['columns']) === $columns);
    }
};
