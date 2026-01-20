<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MaterialIssuanceUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $type;
    public $action;
    public $mrsNo;
    public $status;
    public $data;

    /**
     * Create a new event instance.
     * 
     * @param string $type Type: 'consumable', 'supplies', 'consigned'
     * @param string $action Action: 'created', 'approved', 'rejected', 'status_update', 'qty_updated', 'delivered', 'item_returned', 'item_replaced'
     * @param string|null $mrsNo MRS Number
     * @param string|null $status Current status
     * @param array $data Additional data
     */
    public function __construct($type, $action, $mrsNo = null, $status = null, $data = [])
    {
        $this->type = $type;
        $this->action = $action;
        $this->mrsNo = $mrsNo;
        $this->status = $status;
        $this->data = $data;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn()
    {
        return [
            new Channel('material-issuance'),
            new Channel('material-approval'),
            new Channel('material-ordering'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs()
    {
        return 'material.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith()
    {
        return [
            'type' => $this->type,
            'action' => $this->action,
            'mrs_no' => $this->mrsNo,
            'status' => $this->status,
            'data' => $this->data,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}