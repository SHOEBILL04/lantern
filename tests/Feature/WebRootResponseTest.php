<?php

namespace Tests\Feature;

use Tests\TestCase;

class WebRootResponseTest extends TestCase
{
    public function test_web_root_responds_successfully(): void
    {
        $this->get('/')
            ->assertOk();
    }
}