<?php

namespace App\Console\Commands;

use App\Models\ConsignedDetail;
use App\Models\ConsignedDetailHistory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UpdateConsignedMinimum extends Command
{
    protected $signature   = 'consigned:update-minimum
                                {--dry-run : Show what would change without saving}';

    protected $description = 'Recalculate the minimum for every consigned detail '
                           . 'based on total issued qty over the lookback weeks ÷ weeks × buffer weeks';

    private const LOOKBACK_WEEKS = 2;  // ← change this to look back further
    private const BUFFER_WEEKS   = 2;  // ← change this for more/less buffer

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $cutoff = Carbon::now()->subWeeks(self::LOOKBACK_WEEKS)->startOfDay();

        $this->info(sprintf(
            '[%s] Running consigned minimum update (lookback: %d weeks, since %s)%s',
            now()->format('Y-m-d H:i:s'),
            self::LOOKBACK_WEEKS,
            $cutoff->toDateString(),
            $dryRun ? ' [DRY-RUN]' : ''
        ));

        $issuedHistories = ConsignedDetailHistory::on('newstore')
            ->where('action', 'issued')
            ->where('created_at', '>=', $cutoff)
            ->get(['consigned_detail_id', 'old_values']);

        if ($issuedHistories->isEmpty()) {
            $this->warn('No issued history found in the lookback window. Nothing to update.');
            return self::SUCCESS;
        }

        $issuedTotals = [];

        foreach ($issuedHistories as $history) {
            $detailId  = $history->consigned_detail_id;
            if (!$detailId) continue;

            $oldValues = is_string($history->old_values)
                ? json_decode($history->old_values, true)
                : (array) $history->old_values;

            $issuedQty = (int) ($oldValues['issued_qty'] ?? 0);

            if (!isset($issuedTotals[$detailId])) {
                $issuedTotals[$detailId] = 0;
            }

            $issuedTotals[$detailId] += $issuedQty;
        }

        $updatedCount = 0;
        $skippedCount = 0;
        $rows         = [];

        $details = ConsignedDetail::on('newstore')
            ->whereIn('id', array_keys($issuedTotals))
            ->get(['id', 'commonality', 'item_code', 'supplier', 'minimum'])
            ->keyBy('id');

        DB::connection('newstore')->beginTransaction();

        try {
            foreach ($issuedTotals as $detailId => $totalIssued) {
                $detail = $details->get($detailId);

                if (!$detail) {
                    $skippedCount++;
                    continue;
                }

                // ← Per week formula
                $newMinimum = (int) ceil(($totalIssued / self::LOOKBACK_WEEKS) * self::BUFFER_WEEKS);
                $oldMinimum = (int) $detail->minimum;

                $rows[] = [
                    $detail->item_code,
                    $detail->supplier,
                    $detail->commonality,
                    $totalIssued,
                    $oldMinimum,
                    $newMinimum,
                    $oldMinimum === $newMinimum ? '—' : '✓',
                ];

                if ($oldMinimum === $newMinimum) continue;

                if (!$dryRun) {
                    ConsignedDetail::on('newstore')
                        ->where('id', $detailId)
                        ->update(['minimum' => $newMinimum]);
                }

                $updatedCount++;
            }

            if (!$dryRun) {
                DB::connection('newstore')->commit();
            } else {
                DB::connection('newstore')->rollBack();
            }

        } catch (\Throwable $e) {
            DB::connection('newstore')->rollBack();
            $this->error('Transaction failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->table(
            ['Item Code', 'Supplier', 'Commonality', 'Total Issued (weeks)', 'Old Min', 'New Min', 'Changed'],
            $rows
        );

        $this->info(sprintf(
            'Done. Updated: %d  |  Unchanged: %d  |  Skipped (missing): %d',
            $updatedCount,
            count($issuedTotals) - $updatedCount - $skippedCount,
            $skippedCount
        ));

        if ($dryRun) {
            $this->warn('Dry-run mode — no changes were saved to the database.');
        }

        return self::SUCCESS;
    }
}