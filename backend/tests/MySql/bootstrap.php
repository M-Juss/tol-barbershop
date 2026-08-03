<?php

declare(strict_types=1);

use Dotenv\Dotenv;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$root = dirname(__DIR__, 2);

Dotenv::createImmutable($root)->safeLoad();

$environment = static fn (string $key, string $default = ''): string => (string) ($_ENV[$key] ?? getenv($key) ?: $default);
$database = $environment('DB_DATABASE');

if ($database !== 'tol_barbershop_testing') {
    throw new RuntimeException('MySQL tests may only use the tol_barbershop_testing database.');
}

$host = $environment('DB_HOST', '127.0.0.1');
$port = (int) $environment('DB_PORT', '3306');
$username = $environment('DB_USERNAME');
$password = $environment('DB_PASSWORD');

$pdo = new PDO(
    "mysql:host={$host};port={$port};charset=utf8mb4",
    $username,
    $password,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);

$version = (string) $pdo->query('SELECT VERSION()')->fetchColumn();

if (! preg_match('/^\d+\.\d+\.\d+/', $version, $matches) || version_compare($matches[0], '8.0.0', '<')) {
    throw new RuntimeException("MySQL 8.0 or newer is required; detected {$version}.");
}

$quotedDatabase = '`'.str_replace('`', '``', $database).'`';

$pdo->exec("CREATE DATABASE IF NOT EXISTS {$quotedDatabase} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
