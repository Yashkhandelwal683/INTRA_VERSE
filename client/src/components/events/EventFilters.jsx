import { useDispatch, useSelector } from 'react-redux';
import { setFilters, resetFilters, selectFilters } from '../../features/events/eventsSlice';
import Input from '../ui/Input';
import Button from '../ui/Button';

const CATEGORIES = ['Music', 'Tech', 'Sports', 'Food', 'Art', 'Business', 'Education', 'Other'];

export default function EventFilters() {
  const dispatch = useDispatch();
  const filters  = useSelector(selectFilters);

  const update = (key, value) => dispatch(setFilters({ [key]: value }));

  return (
    <div className="glass-sm p-4 flex flex-wrap gap-3 items-end">
      {/* Search */}
      <div className="flex-1 min-w-[180px]">
        <Input
          placeholder="Search events…"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          id="filter-search"
        />
      </div>

      {/* Category */}
      <div className="min-w-[150px]">
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) => update('category', e.target.value)}
          className="input"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c.toLowerCase()}>{c}</option>
          ))}
        </select>
      </div>

      {/* City */}
      <div className="min-w-[150px]">
        <Input
          placeholder="City…"
          value={filters.city}
          onChange={(e) => update('city', e.target.value)}
          id="filter-city"
        />
      </div>

      {/* Date from */}
      <div className="min-w-[150px]">
        <input
          type="date"
          id="filter-date-from"
          value={filters.dateFrom}
          onChange={(e) => update('dateFrom', e.target.value)}
          className="input"
        />
      </div>

      {/* Date to */}
      <div className="min-w-[150px]">
        <input
          type="date"
          id="filter-date-to"
          value={filters.dateTo}
          onChange={(e) => update('dateTo', e.target.value)}
          className="input"
        />
      </div>

      <Button variant="ghost" size="sm" onClick={() => dispatch(resetFilters())}>
        Clear
      </Button>
    </div>
  );
}
