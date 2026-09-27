import { useSelector, useDispatch } from 'react-redux';
import { selectFilters, setPage } from '../features/events/eventsSlice';
import { useGetPublicEventsQuery } from '../features/events/eventsApi';
import EventFilters from '../components/events/EventFilters';
import EventGrid    from '../components/events/EventGrid';
import Pagination   from '../components/ui/Pagination';

export default function Events() {
  const dispatch = useDispatch();
  const filters  = useSelector(selectFilters);

  const queryParams = {
    ...(filters.search   && { search:   filters.search }),
    ...(filters.category && { category: filters.category }),
    page:  filters.page,
    limit: 12,
  };

  const { data, isLoading, error } = useGetPublicEventsQuery(queryParams);
  const events     = data?.events ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="container-app py-10">
      <div className="mb-8">
        <h1 className="page-title">Browse Events</h1>
        <p className="page-subtitle">Discover experiences happening around you</p>
      </div>

      <div className="mb-6">
        <EventFilters />
      </div>

      <EventGrid events={events} isLoading={isLoading} error={error} />

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={(p) => dispatch(setPage(p))}
      />
    </div>
  );
}
